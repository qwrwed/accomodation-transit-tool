/* eslint-disable @typescript-eslint/naming-convention */
import React, { useContext } from "react";
import {
  // DEFAULT_MIN_PRICE,
  MapContext,
  // MapContext,
} from "../components/Map/MapContext";

const outcodeData = require("./rightmove/rightmoveOutcodeData.json"); // https://github.com/ISNIT0/rightmove-outcode-scraper
const rightmoveStationNameToIdentifier = require("./rightmove/rightmove_name_to_identifier_STATION.json");

const KM_PER_MILE = 1.609;

export const postcode_to_outcode = (postcode) => {
  if (!postcode) {
    return postcode;
  }
  return postcode.split(" ")[0];
};

const getOnthemarketLink = ({ postcode }) => {
  // ${DEFAULT_MIN_PRICE && `min-price=${DEFAULT_MIN_PRICE}`}
  if (!postcode) return null;
  const { filterData } = useContext(MapContext);
  // eslint-disable-next-line prettier/prettier
  const url = `https://www.onthemarket.com/to-rent/property/${postcode
    .toLowerCase()
    .replace(" ", "-")}/?furnished=furnished
max-bedrooms=${filterData["max-bedrooms"]}
max-price=${filterData["max-price"]}
min-bedrooms=${filterData["min-bedrooms"]}
radius=${filterData["home-radius"]}
view=grid`;
  return url.replace(/(?:\r\n|\r|\n)/g, "&");
};

const getOpenrentLink = ({ postcode }) => {
  // prices_min=${DEFAULT_MIN_PRICE}
  if (!postcode) return null;
  const { filterData } = useContext(MapContext);
  // eslint-disable-next-line prettier/prettier
  const url = `https://www.openrent.co.uk/properties-to-rent/?isLive=true&term=${postcode}
area=${filterData["home-radius"] * KM_PER_MILE}
prices_max=${filterData["max-price"]}
bedrooms_min=${filterData["min-bedrooms"]}
bedrooms_max=${filterData["max-bedrooms"]}
searchType=km
furnishedType=1`;
  return url.replace(/(?:\r\n|\r|\n)/g, "&");
};

const getZooplaLink = ({ postcode }) => {
  // price_min=${DEFAULT_MIN_PRICE}
  if (!postcode) return null;
  const { filterData } = useContext(MapContext);
  const url = `https://www.zoopla.co.uk/search/?q=${postcode}
beds_min=${filterData["min-bedrooms"]}
beds_max=${filterData["max-bedrooms"]}
price_frequency=per_month
price_max=${filterData["max-price"]}
view_type=list
category=residential
section=to-rent
results_sort=newest_listings
search_source=home
radius=${filterData["home-radius"]}
furnished_state=furnished`;
  return url.replace(/(?:\r\n|\r|\n)/g, "&");
};

const getRightmoveBaseLink = ({ identifier, remove_radius }) => {
  const { filterData } = useContext(MapContext);
  const radius = remove_radius ? 0 : filterData["home-radius"];
  const url = `https://www.rightmove.co.uk/property-to-rent/find.html?
searchType=RENT
locationIdentifier=${identifier}
insId=1
radius=${radius}
maxPrice=${filterData["max-price"]}
minBedrooms=${filterData["min-bedrooms"]}
maxBedrooms=${filterData["max-bedrooms"]}
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

const getRightmoveStationHref = ({ station_name }) => {
  if (!station_name) {
    return null;
  }
  const station_name_rightmove = station_name
    .replace("Underground Station", "Station")
    .replace("Rail Station", "Station"); // TODO: more robust mapping
  const station_identifier =
    rightmoveStationNameToIdentifier[station_name_rightmove];
  if (!station_identifier) {
    return null;
  }
  return getRightmoveBaseLink({ identifier: station_identifier });
};

const getRightmoveOutcodeHref = ({ outcode }) => {
  if (!outcode) {
    return null;
  }
  const jsonInfo = outcodeData.find(
    ({ outcode: jsonOutcode }) => jsonOutcode === outcode,
  );
  let codedOutcode;
  if (jsonInfo) {
    ({ code: codedOutcode } = jsonInfo);
  } else {
    return null;
  }
  // minPrice=${DEFAULT_MIN_PRICE}
  return getRightmoveBaseLink({
    identifier: `OUTCODE%5E${codedOutcode}`,
    remove_radius: true,
  });
};

const PropertyLink = ({ children, href }) =>
  href && (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <br />
    </a>
  );

export const OnthemarketLink = ({ postcode }) => (
  <PropertyLink href={getOnthemarketLink({ postcode })}>
    OnTheMarket
  </PropertyLink>
);

export const OpenrentLink = ({ postcode }) => (
  <PropertyLink href={getOpenrentLink({ postcode })}>
    OpenRent (min radius 2km)
  </PropertyLink>
);

export const RightmoveLink = ({ station_name, outcode }) => {
  const stationHref = getRightmoveStationHref({ station_name });
  if (stationHref) {
    return <PropertyLink href={stationHref}>Rightmove</PropertyLink>;
  }
  const outcodeHref = getRightmoveOutcodeHref({ outcode });
  return <PropertyLink href={outcodeHref}>Rightmove ({outcode})</PropertyLink>;
};
export const ZooplaLink = ({ postcode }) => (
  <PropertyLink href={getZooplaLink({ postcode })}>Zoopla</PropertyLink>
);
