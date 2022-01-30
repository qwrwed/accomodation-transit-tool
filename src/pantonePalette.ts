import Color from "color";

const pantone = require("./@PANTONE.palette.json");

interface PantonePaletteColor{
  name: string,
  r: number,
  g: number,
  b: number,
}

const pantonePalette: Record<string, string> = {};
pantone.forEach(({name, r, g, b,}: PantonePaletteColor) => {
  pantonePalette[name] = Color.rgb([r, g, b].map((ch) => ch * 255)).hex();
});

export default pantonePalette;
