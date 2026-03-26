export type GalleryMediaType = 'image' | 'images' | 'video';
export type GalleryAspectRatio = 'square' | 'portrait' | 'landscape' | 'feature';

export interface GalleryCollectionItem {
  id: string;
  sequence: number;
  eyebrow: string;
  title: string;
  description: string;
  alt: string;
  mediaType: GalleryMediaType;
  media: string[];
  aspectRatio: GalleryAspectRatio;
  poster?: string;
  chip?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

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

export const getGalleryTileRatioLabel = (aspectRatio: GalleryAspectRatio) => {
  switch (aspectRatio) {
    case 'feature':
      return 'Feature panel';
    case 'portrait':
      return 'Portrait panel';
    case 'landscape':
      return 'Landscape panel';
    case 'square':
    default:
      return 'Square panel';
  }
};
