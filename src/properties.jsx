/* eslint-disable @typescript-eslint/naming-convention */
import React from "react";

const outcodeData = require("./rightmoveOutcodeData.json"); // https://github.com/ISNIT0/rightmove-outcode-scraper

const MIN_BEDROOMS = 0;
const MAX_BEDROOMS = 2;
const MIN_PRICE = 0;
const MAX_PRICE = 1750;
const RADIUS = 0.5;

export const getZooplaLink = ({ postcode }) => {
  if (!postcode) {
    return null;
  }
  const url = `https://www.zoopla.co.uk/search/?q=${postcode}
beds_min=${MIN_BEDROOMS}
beds_max=${MAX_BEDROOMS}
price_frequency=per_month
price_min=${MIN_PRICE}
price_max=${MAX_PRICE}
view_type=list
category=residential
section=to-rent
results_sort=newest_listings
search_source=home
radius=${RADIUS}
furnished_state=furnished`;
  return url.replace(/(?:\r\n|\r|\n)/g, "&");
};

const getRightmoveLink = ({ postcode }) => {
  if (!postcode) {
    return null;
  }
  const outcode = postcode.split(" ")[0];
  const jsonInfo = outcodeData.find(
    ({ outcode: jsonOutcode }) => jsonOutcode === outcode,
  );
  let codedOutcode;
  if (jsonInfo) {
    ({ code: codedOutcode } = jsonInfo);
  } else {
    return null;
  }
  const url = `https://www.rightmove.co.uk/property-to-rent/find.html?
searchType=RENT
locationIdentifier=OUTCODE%5E${codedOutcode}
insId=1
radius=0
minPrice=${MIN_PRICE}
maxPrice=${MAX_PRICE}
minBedrooms=${MIN_BEDROOMS}
maxBedrooms=${MAX_BEDROOMS}
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

const PropertyLink = ({ children, href }) =>
  href && (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <br />
    </a>
  );

export const RightmoveLink = ({ postcode }) => (
  <PropertyLink href={getRightmoveLink({ postcode })}>
    Rightmove (general area only)
  </PropertyLink>
);

export const ZooplaLink = ({ postcode }) => (
  <PropertyLink href={getZooplaLink({ postcode })}>Zoopla</PropertyLink>
);
