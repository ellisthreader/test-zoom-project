import React from "react";
import { Composition } from "remotion";
import { RelayClarityLaunchVideo } from "./video/RelayClarityLaunchVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RelayClarityLaunchVideo"
      component={RelayClarityLaunchVideo}
      durationInFrames={1150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
