import Papa from "papaparse";

let cache = null;

function normalizeRow(row) {
  // Make this robust to header differences (case-insensitive aliases)
  const get = (keys) => {
    for (const k of keys) {
      if (row[k] != null && row[k] !== "") return row[k];
      // also try case-insensitive
      const found = Object.keys(row).find(h => h.toLowerCase() === k.toLowerCase());
      if (found) return row[found];
    }
    return undefined;
  };

  const id    = get(["City Number","number","city_no","city_id","#"]);
  const name  = get(["name","city","city_name"]);
  const lat   = parseFloat(get(["lat","latitude","y"]));
  const lon   = parseFloat(get(["lon","lng","longitude","x"]));

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { id: id ?? name ?? "?", name: name ?? String(id ?? "?"), lat, lon };
  }
  return null;
}

export async function loadCities() {
  if (cache) return cache;
  const res = await fetch("/data/cities.csv");
  if (!res.ok) throw new Error("Failed to load cities.csv");
  const text = await res.text();

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data || [])
    .map(normalizeRow)
    .filter(Boolean);

  cache = rows;
  return rows;
}
