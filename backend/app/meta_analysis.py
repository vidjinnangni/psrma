import math

from app.models import EffectMeasure, ModelType

LOG_SCALE_MEASURES = {EffectMeasure.ODDS_RATIO, EffectMeasure.RISK_RATIO}
Z_95 = 1.959963984540054


def is_log_scale(measure: EffectMeasure) -> bool:
    return measure in LOG_SCALE_MEASURES


def _require(raw: dict, *keys: str) -> list[float]:
    missing = [k for k in keys if k not in raw]
    if missing:
        raise ValueError(f"Champs manquants pour ce calcul : {', '.join(missing)}")
    return [raw[k] for k in keys]


def compute_effect_size(measure: EffectMeasure, raw: dict) -> tuple[float, float]:
    """Returns (effect, variance) on the analysis scale (log scale for OR/RR)."""

    if measure == EffectMeasure.MEAN_DIFFERENCE:
        n1, m1, sd1, n2, m2, sd2 = _require(raw, "n1", "mean1", "sd1", "n2", "mean2", "sd2")
        if n1 <= 0 or n2 <= 0 or sd1 < 0 or sd2 < 0:
            raise ValueError("n et écarts-types doivent être positifs")
        effect = m1 - m2
        variance = (sd1**2) / n1 + (sd2**2) / n2
        return effect, variance

    if measure == EffectMeasure.STANDARDIZED_MEAN_DIFFERENCE:
        n1, m1, sd1, n2, m2, sd2 = _require(raw, "n1", "mean1", "sd1", "n2", "mean2", "sd2")
        df = n1 + n2 - 2
        if df <= 0 or sd1 < 0 or sd2 < 0:
            raise ValueError("Effectifs insuffisants ou écarts-types invalides")
        pooled_sd = math.sqrt(((n1 - 1) * sd1**2 + (n2 - 1) * sd2**2) / df)
        if pooled_sd == 0:
            raise ValueError("Écart-type combiné nul : impossible de calculer un effet standardisé")
        d = (m1 - m2) / pooled_sd
        j = 1 - 3 / (4 * df - 1)
        g = d * j
        var_d = (n1 + n2) / (n1 * n2) + (d**2) / (2 * (n1 + n2))
        var_g = (j**2) * var_d
        return g, var_g

    if measure in (EffectMeasure.ODDS_RATIO, EffectMeasure.RISK_RATIO):
        events1, n1, events2, n2 = _require(raw, "events1", "n1", "events2", "n2")
        if n1 <= 0 or n2 <= 0 or events1 < 0 or events2 < 0 or events1 > n1 or events2 > n2:
            raise ValueError("Événements/effectifs incohérents")
        a, b = events1, n1 - events1
        c, d = events2, n2 - events2
        if 0 in (a, b, c, d):
            a, b, c, d = a + 0.5, b + 0.5, c + 0.5, d + 0.5

        if measure == EffectMeasure.ODDS_RATIO:
            odds_ratio = (a * d) / (b * c)
            effect = math.log(odds_ratio)
            variance = 1 / a + 1 / b + 1 / c + 1 / d
        else:
            risk1, risk2 = a / (a + b), c / (c + d)
            if risk2 == 0:
                raise ValueError("Risque nul dans le groupe contrôle : risque relatif indéfini")
            rr = risk1 / risk2
            effect = math.log(rr)
            variance = 1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)
        return effect, variance

    if measure == EffectMeasure.CUSTOM:
        if "effect_size" not in raw:
            raise ValueError("effect_size requis pour une mesure personnalisée")
        effect = raw["effect_size"]
        if "variance" in raw:
            variance = raw["variance"]
        elif "se" in raw:
            variance = raw["se"] ** 2
        else:
            raise ValueError("variance ou se requis pour une mesure personnalisée")
        return effect, variance

    raise ValueError(f"Mesure non supportée : {measure}")


def to_display_scale(measure: EffectMeasure, value: float) -> float:
    return math.exp(value) if is_log_scale(measure) else value


def _norm_cdf(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def pool_effects(entries: list[tuple[float, float]], model_type: ModelType) -> dict:
    """entries: list of (effect, variance) on the analysis scale. Returns pooled results
    plus per-study weights (as used by the chosen model, for forest plot sizing)."""

    k = len(entries)
    if k == 0:
        raise ValueError("Aucune taille d'effet à combiner")

    weights_fixed = [1 / v for _, v in entries]
    sum_w = sum(weights_fixed)
    pooled_fixed = sum(w * e for (e, _), w in zip(entries, weights_fixed)) / sum_w

    q_stat = sum(w * (e - pooled_fixed) ** 2 for (e, _), w in zip(entries, weights_fixed))
    df = k - 1

    if df > 0:
        sum_w2 = sum(w**2 for w in weights_fixed)
        c = sum_w - sum_w2 / sum_w
        tau2 = max(0.0, (q_stat - df) / c) if c > 0 else 0.0
    else:
        tau2 = 0.0

    i2 = max(0.0, (q_stat - df) / q_stat) * 100 if q_stat > 0 and df > 0 else 0.0

    if model_type == ModelType.RANDOM:
        weights = [1 / (v + tau2) for _, v in entries]
    else:
        weights = weights_fixed

    sum_w_final = sum(weights)
    pooled_effect = sum(w * e for (e, _), w in zip(entries, weights)) / sum_w_final
    variance_pooled = 1 / sum_w_final
    se = math.sqrt(variance_pooled)
    ci_low = pooled_effect - Z_95 * se
    ci_high = pooled_effect + Z_95 * se
    z = pooled_effect / se
    p_value = 2 * (1 - _norm_cdf(abs(z)))

    return {
        "k": k,
        "pooled_effect": pooled_effect,
        "se": se,
        "ci_low": ci_low,
        "ci_high": ci_high,
        "z": z,
        "p_value": p_value,
        "q": q_stat,
        "df": df,
        "tau2": tau2,
        "i2": i2,
        "weights": weights,
    }
