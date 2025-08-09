let params  = { depots: 22, capacity: 500, fleet: 4 };
let cities  = [];           // [{ id, name, lat, lng, demand }]
let demands = {};           // { [cityId]: demand }

export function setProblemParams(p) { params = { ...params, ...p }; }
export function getProblemParams()  { return { ...params }; }

export function setProblemCities(list) { cities = Array.isArray(list) ? list.slice() : []; }
export function getProblemCities()     { return cities.slice(); }

export function setProblemDemands(map) { demands = { ...map }; }
export function getProblemDemands()    { return { ...demands }; }
