import * as migration_20260902_092608_initial from './20260902_092608_initial';
import * as migration_20260907_120000_two_admin_profiles from './20260907_120000_two_admin_profiles';
import * as migration_20260907_133000_page_typography from './20260907_133000_page_typography';
import * as migration_20260908_093315_production_hardening from './20260908_093315_production_hardening';
import * as migration_20260910_091352_dgtl360_v2_profiles from './20260910_091352_dgtl360_v2_profiles';

export const migrations = [
  {
    up: migration_20260902_092608_initial.up,
    down: migration_20260902_092608_initial.down,
    name: '20260902_092608_initial',
  },
  {
    up: migration_20260907_120000_two_admin_profiles.up,
    down: migration_20260907_120000_two_admin_profiles.down,
    name: '20260907_120000_two_admin_profiles',
  },
  {
    up: migration_20260907_133000_page_typography.up,
    down: migration_20260907_133000_page_typography.down,
    name: '20260907_133000_page_typography',
  },
  {
    up: migration_20260908_093315_production_hardening.up,
    down: migration_20260908_093315_production_hardening.down,
    name: '20260908_093315_production_hardening',
  },
  {
    up: migration_20260910_091352_dgtl360_v2_profiles.up,
    down: migration_20260910_091352_dgtl360_v2_profiles.down,
    name: '20260910_091352_dgtl360_v2_profiles'
  },
];
