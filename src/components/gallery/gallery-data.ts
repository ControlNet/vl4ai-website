export type GalleryMediaType = 'image' | 'images' | 'video';
export type GalleryAspectRatio = 'square' | 'portrait' | 'landscape' | 'feature';

export interface GalleryCollectionItem {
  id: string;
  sequence: number;
  title: string;
  description: string;
  mediaType: GalleryMediaType;
  media: string[];
  feature: boolean;
}

const galleryAspectCycle: readonly GalleryAspectRatio[] = [
  'portrait',
  'landscape',
  'landscape',
  'portrait',
  'square',
  'square',
  'landscape',
  'portrait',
];

export const inferGalleryAspectRatio = ({
  feature,
  mediaType,
  denseIndex,
}: {
  feature: boolean;
  mediaType: GalleryMediaType;
  denseIndex: number;
}): GalleryAspectRatio => {
  if (feature) {
    return 'feature';
  }

  if (mediaType === 'video') {
    return 'landscape';
  }

  return galleryAspectCycle[denseIndex % galleryAspectCycle.length] ?? 'square';
};

export const inferGalleryAlt = (title: string) => `${title} gallery media.`;

export const getGallerySpanClasses = (aspectRatio: GalleryAspectRatio) => {
  switch (aspectRatio) {
    case 'feature':
      return 'sm:col-span-2 sm:row-span-2';
    case 'landscape':
      return 'sm:col-span-2 sm:row-span-1';
    case 'portrait':
      return 'sm:col-span-1 sm:row-span-2';
    case 'square':
    default:
      return 'sm:col-span-1 sm:row-span-1';
  }
};
