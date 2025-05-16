from fastapi import FastAPI

def get_map_data(layer: str,
                 schema_name='public',
                 table_prefix='route'):
    """
    Find the shortest route between two entities (desks or rooms) using their IDs.

    Args:
        schema_name (str): Database schema name
        table_prefix (str): Prefix for the tables

    Returns:
        list: List of coordinates representing the path
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from shapely import wkt
    import geojson

    conn_params = {
        "dbname": "floorplan",
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": "5432"
    }

    try:
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if layer == 'floors':
            cur.execute(f"""
            SELECT name as name, ST_AsText(geom) as geom
            FROM {schema_name}.{table_prefix}_{layer}
            """)
        elif layer == 'desks':
            cur.execute(f"""
            SELECT desk_id as name, ST_AsText(geom) as geom
            FROM {schema_name}.{table_prefix}_{layer};
            """)
        elif layer == 'rooms':
            cur.execute(f"""
            SELECT room_id as name, ST_AsText(geom) as geom
            FROM {schema_name}.{table_prefix}_{layer};
            """)
        elif layer == 'obstacles':
            cur.execute(f"""
            SELECT id as name, ST_AsText(geom) as geom
            FROM {schema_name}.{table_prefix}_{layer};
            """)

        records = cur.fetchall()
        features = []

        for record in records:
            shape = wkt.loads(record["geom"])
            geo_shape = geojson.Feature(
                geometry=shape.__geo_interface__,
                properties={
                    "name": record["name"]
                }
            )
            features.append(geo_shape)

        return geojson.FeatureCollection(features)

    except Exception as e:
        print(f"Error finding route: {str(e)}")
        return None
    finally:
        cur.close()
        conn.close()


app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/geojson/{layer}")
def get_floors(layer: str):
    return get_map_data(layer)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("map-server:app", host="0.0.0.0", port=8000, reload=True)
