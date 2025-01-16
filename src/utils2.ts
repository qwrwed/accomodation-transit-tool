export type Point2D = [number, number];

export const calculateAngle = (A: Point2D, B: Point2D, C: Point2D): number => {
  // calculates the difference between BA and BC
  const [ax, ay] = A;
  const [bx, by] = B;
  const [cx, cy] = C;

  // Calculate vectors BA and BC
  const BAx = ax - bx;
  const BAy = ay - by;
  const BCx = cx - bx;
  const BCy = cy - by;

  // Calculate the dot product of BA and BC
  const dotProduct = BAx * BCx + BAy * BCy;

  // Calculate magnitudes of BA and BC
  const magnitudeBA = Math.sqrt(BAx ** 2 + BAy ** 2);
  const magnitudeBC = Math.sqrt(BCx ** 2 + BCy ** 2);

  // Calculate the cosine of the angle
  const cosTheta = dotProduct / (magnitudeBA * magnitudeBC);

  // Calculate the angle in radians
  const angleRadians = Math.acos(cosTheta);

  // Convert the angle to degrees
  const angleDegrees = angleRadians * (180 / Math.PI);

  return angleDegrees;
};

export const isFacing = (
  centre: Point2D,
  segment_start: Point2D,
  segment_end: Point2D,
): boolean => calculateAngle(centre, segment_start, segment_end) < 90;

console.log(calculateAngle([0, 0], [1, 1], [1, 1]));
