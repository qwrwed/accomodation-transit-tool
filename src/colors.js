import Color from "color";

const pantone = require("./@PANTONE.palette.json");

const pantonePalette = {};
pantone.forEach(({ name, r, g, b }) => {
  pantonePalette[name] = Color.rgb([r, g, b].map((ch) => ch * 255)).hex();
});

const lineColors = {
  bakerloo: pantonePalette["470"],
  central: pantonePalette["485"],
  circle: pantonePalette["116"],
  picadilly: pantonePalette["072"],
  district: pantonePalette["356"],
  "waterloo-city": pantonePalette["338"],
  "hammersmith-city": pantonePalette["197"],
  victoria: pantonePalette["299"],
  jubilee: pantonePalette["430"],
  metropolitan: pantonePalette["235"],
  northern: pantonePalette.Black,
  // elizabeth: pantonePalette["266c"],
};

export { pantonePalette, lineColors };
