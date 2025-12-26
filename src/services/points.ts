import path from 'path';
import { readJsonFile, writeJsonFile } from './storage';

const POINTS_FILE = 'points.json';

type PointsRecord = Record<
  string,
  {
    points: number;
    level: number;
    updatedAt: string;
  }
>;

function calculateLevel(points: number): number {
  return Math.max(1, Math.floor(points / 100) + 1);
}

async function loadPoints(): Promise<PointsRecord> {
  return readJsonFile<PointsRecord>(POINTS_FILE, {});
}

async function savePoints(data: PointsRecord): Promise<void> {
  await writeJsonFile(POINTS_FILE, data);
}

export async function getPoints(userId: string): Promise<{ points: number; level: number }> {
  const store = await loadPoints();
  const entry = store[userId.toLowerCase()];
  return entry ? { points: entry.points, level: entry.level } : { points: 0, level: 1 };
}

export async function addPoints(
  userId: string,
  amount: number
): Promise<{ points: number; level: number }> {
  const store = await loadPoints();
  const key = userId.toLowerCase();
  const current = store[key] ?? { points: 0, level: 1, updatedAt: new Date().toISOString() };
  const newPoints = Math.max(0, current.points + amount);
  const level = calculateLevel(newPoints);
  store[key] = { points: newPoints, level, updatedAt: new Date().toISOString() };
  await savePoints(store);
  return { points: newPoints, level };
}

export async function setPoints(
  userId: string,
  value: number
): Promise<{ points: number; level: number }> {
  const store = await loadPoints();
  const key = userId.toLowerCase();
  const points = Math.max(0, value);
  const level = calculateLevel(points);
  store[key] = { points, level, updatedAt: new Date().toISOString() };
  await savePoints(store);
  return { points, level };
}

export async function getLeaderboard(limit = 10): Promise<Array<{ user: string; points: number; level: number }>> {
  const store = await loadPoints();
  return Object.entries(store)
    .map(([user, data]) => ({ user, points: data.points, level: data.level }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}
