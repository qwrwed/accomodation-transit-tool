/* eslint-disable @typescript-eslint/naming-convention */
import React from "react";

const outcodeData = require("./rightmoveOutcodeData.json"); // https://github.com/ISNIT0/rightmove-outcode-scraper

export const getRightmoveLink = ({ postcode }) => {
  const outcode = postcode.split(" ")[0];
  const jsonInfo = outcodeData.find(
    ({ outcode: jsonOutcode }) => jsonOutcode === outcode,
  );
  let codedOutcode;
  if (jsonInfo) {
    ({ code: codedOutcode } = jsonInfo);
  } else {
    return "#";
  }
  const url = `https://www.rightmove.co.uk/property-to-rent/find.html?
searchType=RENT
locationIdentifier=OUTCODE%5E${codedOutcode}
insId=1
radius=0
minPrice=0
maxPrice=1750
minBedrooms=0
maxBedrooms=2
displayPropertyType=
maxDaysSinceAdded=
sortByPriceDescending=
includeLetAgreed=false
primaryDisplayPropertyType=
secondaryDisplayPropertyType=
oldDisplayPropertyType=
oldPrimaryDisplayPropertyType=
letType=
letFurnishType=furnished
houseFlatShare=
`;
  return url.replace(/(?:\r\n|\r|\n)/g, "&");
};

export const _ = null;
export const RightmoveLink = ({ postcode }) => {
  const href = getRightmoveLink({ postcode });
  return (
    href && (
      <a href={href} target="_blank" rel="noopener noreferrer">
        Rightmove (general area only)
      </a>
    )
  );
};
