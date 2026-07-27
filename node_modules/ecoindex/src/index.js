import reference from 'ecoindex_reference' with {type: 'json'};

/**
 * Return grades list.
 */
export function getEcoIndexGradesList() {
  return reference.grades;
}

/**
 * Return quantiles list.
 * @returns {{dom: number[], size: number[], req: number[]}}
 */
export function getQuantiles() {
  return {
    dom: reference.quantiles.dom_size,
    req: reference.quantiles.nb_request,
    size: reference.quantiles.response_size,
  }
}

/**
 * Compute ecoIndex based on formula from web site www.ecoindex.fr
 * @param {number}  dom     Number of elements in DOM.
 * @param {number}  req     Number of requests.
 * @param {number}  size    Size of request.
 * @returns {number} EcoIndex value.
 */
export function computeEcoIndex(dom, req, size) {
  const quantiles = getQuantiles();
  const q_dom = computeQuantile(quantiles.dom, dom);
  const q_req = computeQuantile(quantiles.req, req);
  const q_size = computeQuantile(quantiles.size, size);

  return 100 - 5 * (3 * q_dom + 2 * q_req + q_size) / 6;
}

/**
 * Get quantile index for given quantiles list and value.
 *
 * @param {number[]}  quantiles   Quantiles list.
 * @param {number}    value       Value.
 * @returns {number}  Quantile index.
 */
export function computeQuantile(quantiles, value) {
  for (let i = 1; i < quantiles.length; i++) {
    if (value < quantiles[i]) return (i - 1 + (value - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1]));
  }
  return quantiles.length - 1;
}

/**
 * Return the grade associated to the ecoIndex value.
 * @param {number}    ecoIndex   The ecoIndex value.
 * @returns {string}  The associated grade.
 */
export function getEcoIndexGrade(ecoIndex) {
  if (ecoIndex < 0 || ecoIndex > 100) {
    return false;
  }

  const ecoIndexGrades = getEcoIndexGradesList();
  let name = false, i = 0;
  do {
    if (ecoIndex > ecoIndexGrades[i].value) {
      name = ecoIndexGrades[i].grade;
    }
  } while (name === false && i++ < ecoIndexGrades.length - 1);

  return name;
}

/**
 * Get gases emission from EcoIndex value.
 * @param {number} ecoIndex   The ecoIndex value.
 * @returns {string}  The gas emission.
 */
export function computeGreenhouseGasesEmissionfromEcoIndex(ecoIndex) {
  return (2 + 2 * (50 - ecoIndex) / 100).toFixed(2);
}

/**
 * Get water consumption from EcoIndex value.
 * @param {number}  ecoIndex  The ecoIndex value.
 * @returns {string}  The water consumption.
 */
export function computeWaterConsumptionfromEcoIndex(ecoIndex) {
  return (3 + 3 * (50 - ecoIndex) / 100).toFixed(2);
}
