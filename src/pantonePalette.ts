import Color from "color";

const pantone = require("./@PANTONE.palette.json");

const pantonePalette = {};
pantone.forEach(({ name, r, g, b }) => {
  pantonePalette[name] = Color.rgb([r, g, b].map((ch) => ch * 255)).hex();
});

export default pantonePalette;
