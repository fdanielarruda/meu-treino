-- MySQL: banco `meu_treino` (incluído no backup automático do db-sync: ele exporta todos os bancos do MySQL local)
CREATE DATABASE IF NOT EXISTS meu_treino CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meu_treino;

CREATE TABLE IF NOT EXISTS exercises (
  id         CHAR(36)     PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS workouts (
  id           CHAR(36)     PRIMARY KEY,
  workout_date DATE         NOT NULL,
  title        VARCHAR(100) NOT NULL DEFAULT 'Treino',
  created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX workouts_date_idx (workout_date)
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id          CHAR(36)      PRIMARY KEY,
  workout_id  CHAR(36)      NOT NULL,
  exercise_id CHAR(36)      NOT NULL,
  set_number  INT           NOT NULL,
  reps        INT           NOT NULL,
  weight_kg   DECIMAL(6, 2) NOT NULL DEFAULT 0,
  completed   TINYINT(1)    NOT NULL,  -- 1 = completei, 0 = falhei
  created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CHECK (reps >= 0),
  CHECK (weight_kg >= 0),
  FOREIGN KEY (workout_id)  REFERENCES workouts(id)  ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  INDEX sets_workout_idx (workout_id)
);
