export const SHOW_IMAGES: Record<string, any> = {
  'Breakfast of Champions': require('@assets/showImages/breakfastofchampions.jpg'),
  'The Willows': require('@assets/showImages/the-willows.jpg'),
};

export const getShowImage = (showName: string): any => {
  // Use the show's own image for lock-screen/notification artwork when one
  // exists, falling back to the generic WMBR cover otherwise.
  return SHOW_IMAGES[showName] || require('@assets/cover.png');
};
