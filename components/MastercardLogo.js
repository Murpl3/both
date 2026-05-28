import React from 'react';
import Svg, { Polygon, Path, G } from 'react-native-svg';

const MastercardLogo = ({ width = 45, height = 28 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 143 88.78" preserveAspectRatio="xMidYMid meet">
      <G transform="translate(-440.5 -467.61)">
        <Polygon
          points="52.16 79.29 90.83 79.29 90.83 9.49 52.16 9.49 52.16 79.29"
          fill="#ff5f00"
        />
        <Path
          d="M495.12,512A44.38,44.38,0,0,1,512,477.1a44.39,44.39,0,1,0,0,69.8A44.39,44.39,0,0,1,495.12,512"
          fill="#eb001b"
        />
        <Path
          d="M583.5,512A44.15,44.15,0,0,1,512,546.9a44.52,44.52,0,0,0,0-69.8A44.15,44.15,0,0,1,583.5,512Z"
          fill="#f79e1b"
        />
      </G>
    </Svg>
  );
};

export default MastercardLogo;
