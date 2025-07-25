// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_free_nightcrawler.sql';
import m0001 from './0001_graceful_bishop.sql';
import m0002 from './0002_big_power_man.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  