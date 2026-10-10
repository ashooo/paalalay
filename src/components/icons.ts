import { createElement, type ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IconProps = Pick<ComponentProps<typeof MaterialCommunityIcons>, 'size' | 'color'>;
function icon(name: IconName) {
  return function CareIcon({ size = 24, color }: IconProps) {
    return createElement(MaterialCommunityIcons, { name, size, color, accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', 'aria-hidden': true });
  };
}
// Preloaded with the app fonts so navigation icons are ready at first render.
export const careIconFont = MaterialCommunityIcons.font;
export const ArrowRight = icon('arrow-right');
export const ChartNoAxesCombined = icon('chart-line');
export const HeartPulse = icon('heart-pulse');
export const Hospital = icon('hospital-building');
export const House = icon('home-outline');
export const MapPin = icon('map-marker-outline');
export const MessageCircleHeart = icon('message-text-outline');
export const NotebookPen = icon('notebook-edit-outline');
export const Pill = icon('pill');
export const Plus = icon('plus');
export const ScanLine = icon('line-scan');
export const Send = icon('send-outline');
export const ShieldCheck = icon('shield-check-outline');
export const Stethoscope = icon('stethoscope');
export const X = icon('close');
