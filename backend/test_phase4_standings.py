import unittest
import json
import time
import uuid
from app import app
from routes.payments import IN_MEMORY_REGISTRATIONS
from routes.attendance import IN_MEMORY_EVENT_ATTENDANCE
from routes.leaderboard import (
    IN_MEMORY_SCORING_RULES,
    IN_MEMORY_PLACEMENT_RULES,
    IN_MEMORY_MATCHES,
    IN_MEMORY_MATCH_RESULTS
)

class Phase4LiveStandingsTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

        # Clean in-memory stores for isolated testing
        IN_MEMORY_SCORING_RULES.clear()
        IN_MEMORY_PLACEMENT_RULES.clear()
        IN_MEMORY_MATCHES.clear()
        IN_MEMORY_MATCH_RESULTS.clear()

        # Set up Tournament A
        self.slug_a = f"p4-tourn-a-{int(time.time())}"
        self.team1_id = 'XNV-P4-001'  # Phoenix
        self.team2_id = 'XNV-P4-002'  # Titans
        self.team3_id = 'XNV-P4-003'  # Alpha (Absent)
        self.team4_id = 'XNV-P4-004'  # Omega (Present, missing M2)

        # Set up Tournament B
        self.slug_b = f"p4-tourn-b-{int(time.time())}"
        self.team_b_id = 'XNV-P4-B01'  # Zenith

        # Populate Tournament A registrations
        pass_p1 = f"PASS-P4-1-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_p1] = {
            'pass_id': pass_p1,
            'tournament_slug': self.slug_a,
            'team_id': self.team1_id,
            'team_name': 'Phoenix',
            'captain_name': 'Rahul Sharma',
            'captain_in_game_name': '亗PHOENIX亗',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_p1] = {
            'pass_id': pass_p1,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        pass_p2 = f"PASS-P4-2-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_p2] = {
            'pass_id': pass_p2,
            'tournament_slug': self.slug_a,
            'team_id': self.team2_id,
            'team_name': 'Titans',
            'captain_name': 'Vikram Rao',
            'captain_in_game_name': 'TITANS_V',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_p2] = {
            'pass_id': pass_p2,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        pass_p3 = f"PASS-P4-3-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_p3] = {
            'pass_id': pass_p3,
            'tournament_slug': self.slug_a,
            'team_id': self.team3_id,
            'team_name': 'Alpha Absent',
            'captain_name': 'Amit',
            'captain_in_game_name': 'ALPHA_ABSENT',
            'attendance_status': 'ABSENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_p3] = {
            'pass_id': pass_p3,
            'tournament_slug': self.slug_a,
            'attendance_status': 'ABSENT'
        }

        pass_p4 = f"PASS-P4-4-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_p4] = {
            'pass_id': pass_p4,
            'tournament_slug': self.slug_a,
            'team_id': self.team4_id,
            'team_name': 'Omega Present',
            'captain_name': 'Rohit',
            'captain_in_game_name': 'OMEGA_99',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_p4] = {
            'pass_id': pass_p4,
            'tournament_slug': self.slug_a,
            'attendance_status': 'PRESENT'
        }

        # Populate Tournament B registration
        pass_b1 = f"PASS-P4-B1-{int(time.time())}"
        IN_MEMORY_REGISTRATIONS[pass_b1] = {
            'pass_id': pass_b1,
            'tournament_slug': self.slug_b,
            'team_id': self.team_b_id,
            'team_name': 'Zenith B',
            'captain_name': 'Zenith Captain',
            'captain_in_game_name': 'ZENITH_X',
            'attendance_status': 'PRESENT'
        }
        IN_MEMORY_EVENT_ATTENDANCE[pass_b1] = {
            'pass_id': pass_b1,
            'tournament_slug': self.slug_b,
            'attendance_status': 'PRESENT'
        }

        # Setup scoring rules for Tournament A:
        # Kills = 1 pt/kill (PER_UNIT)
        # Booyah = 10 pts (OCCURRENCE)
        # Placement matrix: 1st -> 12, 2nd -> 9, 3rd -> 8
        # Fouls = -5 pts (PENALTY)
        self.r_kills = self.client.post(f'/api/leaderboard/{self.slug_a}/rules', json={
            'name': 'Kills', 'type': 'PER_UNIT', 'points_per_unit': 1
        }).get_json()['rule']

        self.r_booyah = self.client.post(f'/api/leaderboard/{self.slug_a}/rules', json={
            'name': 'Booyah', 'type': 'OCCURRENCE', 'points_per_unit': 10
        }).get_json()['rule']

        self.r_placement = self.client.post(f'/api/leaderboard/{self.slug_a}/rules', json={
            'name': 'Placement', 'type': 'PLACEMENT',
            'placement_points': [
                {'placement': 1, 'points': 12},
                {'placement': 2, 'points': 9},
                {'placement': 3, 'points': 8}
            ]
        }).get_json()['rule']

        self.r_fouls = self.client.post(f'/api/leaderboard/{self.slug_a}/rules', json={
            'name': 'Fouls', 'type': 'PENALTY', 'points_per_unit': -5
        }).get_json()['rule']

        # Setup scoring rule for Tournament B:
        # Booyah = 20 pts (Different rule)
        self.r_b_booyah = self.client.post(f'/api/leaderboard/{self.slug_b}/rules', json={
            'name': 'Booyah', 'type': 'OCCURRENCE', 'points_per_unit': 20
        }).get_json()['rule']

    def tearDown(self):
        self.app_context.pop()

    def test_phase4_live_cumulative_standings(self):
        # 1. Create Matches for Tournament A
        m1_res = self.client.post(f'/api/leaderboard/{self.slug_a}/matches', json={'title': 'Match 1'}).get_json()
        m1_id = m1_res['match']['id']

        m2_res = self.client.post(f'/api/leaderboard/{self.slug_a}/matches', json={'title': 'Match 2'}).get_json()
        m2_id = m2_res['match']['id']

        m3_res = self.client.post(f'/api/leaderboard/{self.slug_a}/matches', json={'title': 'Match 3'}).get_json()
        m3_id = m3_res['match']['id']

        # Create Match for Tournament B
        mb1_res = self.client.post(f'/api/leaderboard/{self.slug_b}/matches', json={'title': 'Tourn B Match 1'}).get_json()
        mb1_id = mb1_res['match']['id']

        # 2. Enter Match 1 Results for Tournament A:
        # Phoenix (Team 1): Kills: 7 (7), Booyah: 1 (10), Placement: 1st (12), Fouls: 0 (0) => M1 Total = 29
        # Titans (Team 2): Kills: 4 (4), Booyah: 0 (0), Placement: 2nd (9), Fouls: 1 (-5) => M1 Total = 8
        # Omega (Team 4): Kills: 2 (2), Booyah: 0 (0), Placement: 3rd (8), Fouls: 0 (0) => M1 Total = 10
        save_m1 = self.client.put(f'/api/leaderboard/{self.slug_a}/matches/{m1_id}/results', json={
            'results': [
                {
                    'team_id': self.team1_id,
                    'raw_scores': {
                        self.r_kills['id']: 7,
                        self.r_booyah['id']: 1,
                        self.r_placement['id']: 1,
                        self.r_fouls['id']: 0
                    }
                },
                {
                    'team_id': self.team2_id,
                    'raw_scores': {
                        self.r_kills['id']: 4,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 2,
                        self.r_fouls['id']: 1
                    }
                },
                {
                    'team_id': self.team4_id,
                    'raw_scores': {
                        self.r_kills['id']: 2,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 3,
                        self.r_fouls['id']: 0
                    }
                }
            ]
        })
        self.assertEqual(save_m1.status_code, 200, f"save_m1 failed: {save_m1.get_json()}")

        # 3. Enter Match 2 Results for Tournament A:
        # Phoenix: Kills: 10 (10), Booyah: 1 (10), Placement: 1st (12), Fouls: 0 => M2 Total = 32
        # Titans: Kills: 6 (6), Booyah: 0, Placement: 2nd (9), Fouls: 0 => M2 Total = 15
        # Omega: Has NO result entered for M2 (missing result) => must evaluate to 0!
        save_m2 = self.client.put(f'/api/leaderboard/{self.slug_a}/matches/{m2_id}/results', json={
            'results': [
                {
                    'team_id': self.team1_id,
                    'raw_scores': {
                        self.r_kills['id']: 10,
                        self.r_booyah['id']: 1,
                        self.r_placement['id']: 1,
                        self.r_fouls['id']: 0
                    }
                },
                {
                    'team_id': self.team2_id,
                    'raw_scores': {
                        self.r_kills['id']: 6,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 2,
                        self.r_fouls['id']: 0
                    }
                }
            ]
        })
        self.assertEqual(save_m2.status_code, 200, f"save_m2 failed: {save_m2.get_json()}")

        # 4. Enter Match 3 Results for Tournament A:
        # Phoenix: Kills: 8 (8), Booyah: 1 (10), Placement: 1st (12), Fouls: 0 => M3 Total = 30
        # Titans: Kills: 5 (5), Booyah: 0, Placement: 2nd (9), Fouls: 0 => M3 Total = 14
        # Omega: Kills: 3 (3), Booyah: 0, Placement: 3rd (8), Fouls: 0 => M3 Total = 11
        save_m3 = self.client.put(f'/api/leaderboard/{self.slug_a}/matches/{m3_id}/results', json={
            'results': [
                {
                    'team_id': self.team1_id,
                    'raw_scores': {
                        self.r_kills['id']: 8,
                        self.r_booyah['id']: 1,
                        self.r_placement['id']: 1,
                        self.r_fouls['id']: 0
                    }
                },
                {
                    'team_id': self.team2_id,
                    'raw_scores': {
                        self.r_kills['id']: 5,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 2,
                        self.r_fouls['id']: 0
                    }
                },
                {
                    'team_id': self.team4_id,
                    'raw_scores': {
                        self.r_kills['id']: 3,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 3,
                        self.r_fouls['id']: 0
                    }
                }
            ]
        })
        self.assertEqual(save_m3.status_code, 200, f"save_m3 failed: {save_m3.get_json()}")

        # Enter Tournament B Result (Zenith: Booyah 1 = 20 pts)
        self.client.put(f'/api/leaderboard/{self.slug_b}/matches/{mb1_id}/results', json={
            'results': [
                {
                    'team_id': self.team_b_id,
                    'raw_scores': { self.r_b_booyah['id']: 1 }
                }
            ]
        })

        # 5. TEST GET /api/leaderboard/<tournament_slug>/standings
        res_a = self.client.get(f'/api/leaderboard/{self.slug_a}/standings')
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.get_json()

        self.assertTrue(data_a['success'])
        self.assertEqual(data_a['tournament_slug'], self.slug_a)
        self.assertEqual(len(data_a['matches']), 3)

        standings = data_a['standings']

        # Requirement 7: Only PRESENT teams appear. Absent Team 3 must NOT be in standings.
        standings_team_ids = [s['team_id'] for s in standings]
        self.assertIn(self.team1_id, standings_team_ids)
        self.assertIn(self.team2_id, standings_team_ids)
        self.assertIn(self.team4_id, standings_team_ids)
        self.assertNotIn(self.team3_id, standings_team_ids)
        self.assertEqual(len(standings), 3)

        # Check Team 1 (Phoenix):
        # M1 = 29, M2 = 32, M3 = 30 => Overall Total = 91 => Rank 1
        phoenix = next(s for s in standings if s['team_id'] == self.team1_id)
        self.assertEqual(phoenix['rank'], 1)
        self.assertEqual(phoenix['team_name'], 'Phoenix')
        self.assertEqual(phoenix['captain_in_game_name'], '亗PHOENIX亗')
        self.assertEqual(phoenix['match_scores'][m1_id], 29)
        self.assertEqual(phoenix['match_scores'][m2_id], 32)
        self.assertEqual(phoenix['match_scores'][m3_id], 30)
        self.assertEqual(phoenix['overall_total'], 91)

        # Check Team 2 (Titans):
        # M1 = 8, M2 = 15, M3 = 14 => Overall Total = 37 => Rank 2
        titans = next(s for s in standings if s['team_id'] == self.team2_id)
        self.assertEqual(titans['rank'], 2)
        self.assertEqual(titans['match_scores'][m1_id], 8)
        self.assertEqual(titans['match_scores'][m2_id], 15)
        self.assertEqual(titans['match_scores'][m3_id], 14)
        self.assertEqual(titans['overall_total'], 37)

        # Requirement 8: Missing result for Omega in M2 is treated as 0 without removing team
        # M1 = 10, M2 = 0, M3 = 11 => Overall Total = 21 => Rank 3
        omega = next(s for s in standings if s['team_id'] == self.team4_id)
        self.assertEqual(omega['rank'], 3)
        self.assertEqual(omega['match_scores'][m1_id], 10)
        self.assertEqual(omega['match_scores'][m2_id], 0)
        self.assertEqual(omega['match_scores'][m3_id], 11)
        self.assertEqual(omega['overall_total'], 21)

        # Requirement 6: Match details / breakdowns remain available
        self.assertIn('match_breakdowns', phoenix)
        m1_breakdown = phoenix['match_breakdowns'][m1_id]
        self.assertEqual(m1_breakdown['match_title'], 'Match 1')
        self.assertEqual(m1_breakdown['total_points'], 29)
        self.assertEqual(m1_breakdown['raw_scores'][self.r_kills['id']], 7)
        self.assertEqual(m1_breakdown['calculated_scores'][self.r_kills['id']], 7)
        self.assertEqual(m1_breakdown['calculated_scores'][self.r_placement['id']], 12)

        # 6. Requirement 1: Tournament Isolation
        res_b = self.client.get(f'/api/leaderboard/{self.slug_b}/standings')
        data_b = res_b.get_json()
        self.assertEqual(len(data_b['matches']), 1)
        self.assertEqual(len(data_b['standings']), 1)
        self.assertEqual(data_b['standings'][0]['team_id'], self.team_b_id)
        self.assertEqual(data_b['standings'][0]['overall_total'], 20)
        # Verify Tournament A teams are NOT in Tournament B standings
        self.assertNotIn(self.team1_id, [s['team_id'] for s in data_b['standings']])

        # 7. Requirement 8 & 9: Dynamic Updates when Phase 3 results are edited
        # Edit Phoenix in Match 2: Kills 10 -> 20 (extra 10 points) => M2 = 42, Overall Total = 101
        self.client.put(f'/api/leaderboard/{self.slug_a}/matches/{m2_id}/results', json={
            'results': [
                {
                    'team_id': self.team1_id,
                    'raw_scores': {
                        self.r_kills['id']: 20,
                        self.r_booyah['id']: 1,
                        self.r_placement['id']: 1,
                        self.r_fouls['id']: 0
                    }
                }
            ]
        })
        updated_standings = self.client.get(f'/api/leaderboard/{self.slug_a}/standings').get_json()['standings']
        updated_phoenix = next(s for s in updated_standings if s['team_id'] == self.team1_id)
        self.assertEqual(updated_phoenix['match_scores'][m2_id], 42)
        self.assertEqual(updated_phoenix['overall_total'], 101)

        # 8. Requirement 5: Dynamically adding Match 4
        m4_res = self.client.post(f'/api/leaderboard/{self.slug_a}/matches', json={'title': 'Match 4'}).get_json()
        m4_id = m4_res['match']['id']

        # Enter Match 4 result: Titans get Kills 20 (20 pts) + Placement 1st (12 pts) = 32 pts
        self.client.put(f'/api/leaderboard/{self.slug_a}/matches/{m4_id}/results', json={
            'results': [
                {
                    'team_id': self.team2_id,
                    'raw_scores': {
                        self.r_kills['id']: 20,
                        self.r_booyah['id']: 0,
                        self.r_placement['id']: 1,
                        self.r_fouls['id']: 0
                    }
                }
            ]
        })

        standings_with_m4 = self.client.get(f'/api/leaderboard/{self.slug_a}/standings').get_json()
        self.assertEqual(len(standings_with_m4['matches']), 4)
        m4_titans = next(s for s in standings_with_m4['standings'] if s['team_id'] == self.team2_id)
        # Titans was 37, now 37 + 32 = 69
        self.assertEqual(m4_titans['match_scores'][m4_id], 32)
        self.assertEqual(m4_titans['overall_total'], 69)

        # Phoenix had no M4 result yet => M4 = 0, overall unchanged at 101
        m4_phoenix = next(s for s in standings_with_m4['standings'] if s['team_id'] == self.team1_id)
        self.assertEqual(m4_phoenix['match_scores'][m4_id], 0)
        self.assertEqual(m4_phoenix['overall_total'], 101)

        # 9. Requirement 9: Scoring-rule changes automatically flow through
        # Change Booyah points from 10 to 15 (Phoenix won Booyah in M1, M2, M3 => +5 in M1, +5 in M2, +5 in M3 = +15 overall)
        self.client.put(f'/api/leaderboard/{self.slug_a}/rules/{self.r_booyah["id"]}', json={
            'points_per_unit': 15
        })

        recalc_standings = self.client.get(f'/api/leaderboard/{self.slug_a}/standings').get_json()['standings']
        recalc_phoenix = next(s for s in recalc_standings if s['team_id'] == self.team1_id)
        # Previous total 101 + 15 = 116
        self.assertEqual(recalc_phoenix['overall_total'], 116)
        print("\n[PASS] All Phase 4 Live Standings requirements verified!")

if __name__ == '__main__':
    unittest.main()
