import sys
import os

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config, get_supabase_client
from routes.tournaments import MOCK_TOURNAMENTS
from routes.colleges import MOCK_COLLEGES
from routes.teams import MOCK_TEAMS
from routes.notifications import MOCK_NOTIFICATIONS

def seed_all():
    print("=" * 60)
    print("⚡ Xenova / Phoenix Esports - Supabase Data Seeding")
    print("=" * 60)
    print(f"Target URL: {Config.SUPABASE_URL}")
    print(f"Target Key: {Config.SUPABASE_KEY[:12]}..." if Config.SUPABASE_KEY else "Target Key: NOT CONFIGURED")
    print("-" * 60)

    try:
        supabase = get_supabase_client()
        
        # 1. Seed Tournaments
        print("\n🏆 Seeding Tournaments...")
        try:
            existing_res = supabase.table('tournaments').select('slug').execute()
            existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
            to_insert = [t for t in MOCK_TOURNAMENTS if t['slug'] not in existing_slugs]
            if to_insert:
                res = supabase.table('tournaments').insert(to_insert).execute()
                print(f"  ✅ Inserted {len(res.data or [])} tournaments.")
            else:
                print(f"  ℹ️ All {len(MOCK_TOURNAMENTS)} tournaments already present.")
        except Exception as e:
            print(f"  ❌ Tournaments seeding failed: {e}")

        # 2. Seed Colleges
        print("\n🏫 Seeding Colleges...")
        try:
            existing_res = supabase.table('colleges').select('slug').execute()
            existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
            to_insert = [c for c in MOCK_COLLEGES if c['slug'] not in existing_slugs]
            if to_insert:
                res = supabase.table('colleges').insert(to_insert).execute()
                print(f"  ✅ Inserted {len(res.data or [])} colleges.")
            else:
                print(f"  ℹ️ All {len(MOCK_COLLEGES)} colleges already present.")
        except Exception as e:
            print(f"  ❌ Colleges seeding failed: {e}")

        # 3. Seed Teams
        print("\n👥 Seeding Teams...")
        try:
            existing_res = supabase.table('teams').select('slug').execute()
            existing_slugs = {item['slug'] for item in (existing_res.data or []) if 'slug' in item}
            to_insert = [t for t in MOCK_TEAMS if t['slug'] not in existing_slugs]
            if to_insert:
                res = supabase.table('teams').insert(to_insert).execute()
                print(f"  ✅ Inserted {len(res.data or [])} teams.")
            else:
                print(f"  ℹ️ All {len(MOCK_TEAMS)} teams already present.")
        except Exception as e:
            print(f"  ❌ Teams seeding failed: {e}")

        # 4. Seed Notifications
        print("\n🔔 Seeding Notifications...")
        try:
            existing_res = supabase.table('notifications').select('id').execute()
            existing_ids = {item['id'] for item in (existing_res.data or []) if 'id' in item}
            to_insert = [n for n in MOCK_NOTIFICATIONS if n['id'] not in existing_ids]
            if to_insert:
                res = supabase.table('notifications').insert(to_insert).execute()
                print(f"  ✅ Inserted {len(res.data or [])} notifications.")
            else:
                print(f"  ℹ️ All {len(MOCK_NOTIFICATIONS)} notifications already present.")
        except Exception as e:
            print(f"  ❌ Notifications seeding failed: {e}")

        print("\n" + "=" * 60)
        print("🎉 Database Seeding Complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Seeding Failed: {e}")
        print("\n💡 NOTE:")
        print("If you received 'Invalid API key', make sure your SUPABASE_KEY in backend/.env")
        print("is the 'service_role' or 'anon' JWT secret from Supabase Dashboard:")
        print("https://supabase.com/dashboard/project/icgqikmzhtynpatntglw/settings/api")
        print("Alternatively, execute `backend/supabase_schema_and_seed.sql` in the Supabase SQL Editor.")

if __name__ == '__main__':
    seed_all()
