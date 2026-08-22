import type {ComponentType, LazyExoticComponent} from 'react';
import type {SVGProps} from 'react';

export type ToolCategory = 'Security' | 'Encoding' | 'Data' | 'Media' | 'Text';

export type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface ToolDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ToolCategory;
  icon: HeroIcon;
  keywords: string[];
  component: LazyExoticComponent<ComponentType>;
}
