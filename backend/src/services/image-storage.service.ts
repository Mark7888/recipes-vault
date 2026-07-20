import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

const MAX_IMAGE_DIMENSION = 1920;

export async function ensureImagesDir(): Promise<void> {
  await fs.mkdir(env.IMAGES_DIR, { recursive: true });
}

export async function saveImage(buffer: Buffer, recipeId: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const filePath = path.join(env.IMAGES_DIR, filename);

  await sharp(buffer)
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .toFile(filePath);

  return filename;
}

export async function deleteImageFile(filePath: string): Promise<void> {
  const fullPath = path.join(env.IMAGES_DIR, filePath);
  await fs.unlink(fullPath).catch(() => {});
}

export async function copyImageFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath);
  const newFilename = `${randomUUID()}${ext}`;
  await fs.copyFile(path.join(env.IMAGES_DIR, filePath), path.join(env.IMAGES_DIR, newFilename));
  return newFilename;
}

export async function saveImageRecord(recipeId: string, filePath: string, isCover: boolean = false) {
  const count = await prisma.image.count({ where: { recipeId } });
  return prisma.image.create({ data: { recipeId, filePath, isCover, order: count } });
}

export async function reorderImages(recipeId: string, imageIds: string[]) {
  const images = await prisma.image.findMany({ where: { recipeId }, select: { id: true } });
  const existingIds = new Set(images.map((i) => i.id));
  if (imageIds.length !== existingIds.size || !imageIds.every((id) => existingIds.has(id))) {
    throw new Error('imageIds must match the recipe\'s current image set');
  }
  await prisma.$transaction(
    imageIds.map((id, order) => prisma.image.update({ where: { id }, data: { order } }))
  );
}

export async function downloadAndSaveImage(imageUrl: string, recipeId: string): Promise<string | null> {
  try {
    const axios = await import('axios');
    const response = await axios.default.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 8 * 1024 * 1024,
    });
    const buffer = Buffer.from(response.data as ArrayBuffer);
    return saveImage(buffer, recipeId, 'image.jpg');
  } catch {
    return null;
  }
}
