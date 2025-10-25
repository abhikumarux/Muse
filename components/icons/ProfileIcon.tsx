import * as React from "react";
import Svg, { Path, G, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {}

export const ProfileIcon = (props: IProps) => {
  return (
    <Svg width={props.width ?? 54} height={props.height ?? 54} fill="none" viewBox="0 0 54 54" {...props}>
      <G fill={props.fill ?? "#FDFCFE"}>
        <Path d="M13.17.01H1.25C.56.01.01.57.01 1.25v11.92a1.24 1.24 0 1 0 2.48 0V2.48h10.67a1.24 1.24 0 1 0 0-2.48zM53.93 13.17V1.25c0-.69-.56-1.24-1.24-1.24H40.77a1.24 1.24 0 1 0 0 2.48h10.69v10.67a1.24 1.24 0 1 0 2.48 0zM40.78 53.69H52.7c.69 0 1.24-.56 1.24-1.24V40.53a1.24 1.24 0 1 0-2.48 0v10.69H40.79a1.24 1.24 0 1 0 0 2.48zM.01 40.52v11.92c0 .69.56 1.24 1.24 1.24h11.92a1.24 1.24 0 1 0 0-2.48H2.48V40.53a1.24 1.24 0 1 0-2.48 0zM27.08 25.91c3.374 0 6.11-3.085 6.11-6.89s-2.736-6.89-6.11-6.89-6.11 3.085-6.11 6.89 2.736 6.89 6.11 6.89M40.34 37.31c.13 4.61-8.29 4.24-12.92 4.24s-13.72.4-13.8-2.81c-.12-4.63 4.51-9.98 12.47-9.98 9.26 0 14.16 5.34 14.25 8.55" />
      </G>
    </Svg>
  );
};
