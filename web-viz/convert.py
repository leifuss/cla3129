#!/usr/bin/env python3
"""Convert Ptolemy shapefiles to GeoJSON for web visualization."""
import shapefile
import json
import os

def shp_to_geojson(shp_path, output_path):
    sf = shapefile.Reader(shp_path)
    fields = [f[0] for f in sf.fields[1:]]
    features = []
    for sr in sf.shapeRecords():
        geom = sr.shape.__geo_interface__
        props = dict(zip(fields, sr.record))
        # Convert any non-serializable types
        for k, v in props.items():
            if isinstance(v, (bytes, bytearray)):
                props[k] = v.decode('utf-8', errors='replace')
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": props
        })
    geojson = {"type": "FeatureCollection", "features": features}
    with open(output_path, 'w') as f:
        json.dump(geojson, f)
    print(f"  {os.path.basename(shp_path)} -> {os.path.basename(output_path)} ({len(features)} features)")

base = "/Users/leifuss/Documents/projects/Ptolemy/shapefiles"
out = "/Users/leifuss/Documents/projects/Ptolemy/web-viz/data"
os.makedirs(out, exist_ok=True)

conversions = [
    ("boundaries_original", "boundary_polys.geojson"),
    ("backdrop", "backdrop.geojson"),
    ("mountains", "mountains.geojson"),
    ("river", "rivers.geojson"),
    ("connections", "connections.geojson"),
    ("marinos_journeys", "journeys.geojson"),
]

print("Converting shapefiles to GeoJSON...")
for shp_name, geojson_name in conversions:
    shp_path = os.path.join(base, shp_name)
    out_path = os.path.join(out, geojson_name)
    try:
        shp_to_geojson(shp_path, out_path)
    except Exception as e:
        print(f"  ERROR converting {shp_name}: {e}")

print("Done.")
