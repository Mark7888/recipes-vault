import { Box, type BoxProps } from '@chakra-ui/react';

/**
 * Drawn stand-in for a recipe with no cover picture. It is pure UI: no Image
 * row exists for it, so it never shows up in the recipe's own gallery and can
 * never be picked as a cover — only the cards that list recipes fall back to
 * it. Strokes follow `currentColor`, so it themes with the card around it.
 */
export function RecipeCoverPlaceholder(props: BoxProps) {
  return (
    <Box
      bg="bg.muted"
      color="fg.subtle"
      display="flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      <svg
        viewBox="0 0 128 88"
        width="66%"
        height="66%"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="No cover image"
      >
        {/* Plate: rim and inner well */}
        <circle cx="64" cy="44" r="27" fill="currentColor" fillOpacity="0.1" />
        <circle cx="64" cy="44" r="18" />
        {/* Fork, on the left of the plate */}
        <path d="M15 14v16M22 14v16M29 14v16" />
        <path d="M15 30c0 4.4 3.1 7.5 7 8 3.9-.5 7-3.6 7-8" />
        <path d="M22 38v36" />
        {/* Spoon, on the right */}
        <ellipse cx="106" cy="27" rx="9" ry="13" />
        <path d="M106 40v34" />
      </svg>
    </Box>
  );
}
