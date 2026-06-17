import React from "react";
import { Composition } from "remotion";
import { ChatoraLaunchVideo } from "./video/ChatoraLaunchVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ChatoraLaunchVideo"
      component={ChatoraLaunchVideo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
