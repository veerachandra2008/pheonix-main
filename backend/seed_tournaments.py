import sys
import os

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config, get_supabase_client
from routes.tournaments import MOCK_TOURNAMENTS

def seed():
    print("Initializing Supabase database seeding for tournaments...")
    try:
        supabase = get_supabase_client()
        print(f"Supabase client initialized: {Config.SUPABASE_URL}")
        
        # Check existing tournaments
        existing_res = supabase.table('tournaments').select('slug').execute()
        existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
        print(f"Found {len(existing_slugs)} existing tournaments in database.")

        to_insert = [t for t in MOCK_TOURNAMENTS if t['slug'] not in existing_slugs]

        if not to_insert:
            print("All 6 mock tournaments already exist in database. No new records inserted.")
            return

        res = supabase.table('tournaments').insert(to_insert).execute()
        inserted_count = len(res.data or [])
        print(f"Successfully inserted {inserted_count} mock tournaments into Supabase!")
        for item in (res.data or []):
            print(f" - {item.get('title')} ({item.get('slug')})")

    except Exception as e:
        print(f"Error seeding database: {e}")

if __name__ == '__main__':
    seed()
