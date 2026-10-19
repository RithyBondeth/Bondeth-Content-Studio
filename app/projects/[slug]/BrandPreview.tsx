"use client";

import { Player } from "@remotion/player";
import { useMemo } from "react";
import { ExplainerVideo } from "../../../src/compositions/ExplainerVideo";
import { FORMATS } from "../../../src/lib/formats";
import { FPS, getVideoTiming } from "../../../src/lib/timing";
import {
  videoSpecSchema,
  type Brand,
  type VideoSpecInput,
} from "../../../src/spec/schema";
import type { ThemeSetting } from "../../../src/theme/resolve";
import { SCENE_SETTLE_FRAMES } from "../../_components/editor/scene-meta";

/** A short sample video in the brand kit's theme, ending on its call to action. */
export const BrandPreview = ({
  title,
  theme,
  brand,
}: {
  title: string;
  theme?: ThemeSetting;
  brand?: Brand;
}) => {
  const spec = useMemo(() => {
    const input: VideoSpecInput = {
      version: 1,
      title,
      captions: false,
      sfx: false,
      theme,
      brand,
      scenes: [
        {
          type: "title",
          heading: title,
          subheading: brand?.name ? `with ${brand.name}` : undefined,
          narration: "",
          durationInSeconds: 2.5,
        },
        {
          type: "list",
          heading: "In every video",
          items: ["Your colors", "Your font", "Your name"],
          style: "checks",
          narration: "",
          durationInSeconds: 2.5,
        },
        {
          type: "cta",
          heading: "Want more like this?",
          action: "Follow for more",
          narration: "",
          durationInSeconds: 3,
        },
      ],
    };
    return videoSpecSchema.parse(input);
  }, [title, theme, brand]);
  const inputProps = useMemo(() => ({ spec }), [spec]);
  const { width, height } = FORMATS.landscape;

  return (
    <Player
      component={ExplainerVideo}
      inputProps={inputProps}
      durationInFrames={getVideoTiming(spec).total}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      autoPlay
      loop
      controls
      acknowledgeRemotionLicense
      initialFrame={SCENE_SETTLE_FRAMES}
      style={{
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgb(255 255 255 / 0.08)",
      }}
    />
  );
};
