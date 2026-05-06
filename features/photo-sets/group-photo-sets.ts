import type { PhotoSet } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type PhotoSetDateGroup = {
  dateKey: string;
  title: string;
  items: PhotoSet[];
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}.${month}.${day}`;
}

export function formatPhotoSetDateLabel(createdAt: number) {
  const date = new Date(createdAt);
  return `${formatDateKey(date)} ${WEEKDAYS[date.getDay()]}`;
}

export function groupPhotoSetsByDate(photoSets: PhotoSet[]): PhotoSetDateGroup[] {
  const groups = new Map<string, PhotoSetDateGroup>();
  const sortedPhotoSets = [...photoSets].sort((a, b) => b.createdAt - a.createdAt);

  for (const photoSet of sortedPhotoSets) {
    const date = new Date(photoSet.createdAt);
    const dateKey = formatDateKey(date);
    const group = groups.get(dateKey);

    if (group) {
      group.items.push(photoSet);
      continue;
    }

    groups.set(dateKey, {
      dateKey,
      title: formatPhotoSetDateLabel(photoSet.createdAt),
      items: [photoSet],
    });
  }

  return Array.from(groups.values());
}
