import { useVideoConfig } from "remotion";

/** Every scene composes itself for the active format — nothing is cropped. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return { W: width, H: height, portrait };
};
