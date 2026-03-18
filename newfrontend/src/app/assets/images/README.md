# Images Assets Folder

This folder contains all images and logos used throughout the codeIT application.

## How to Add Images

1. **Place your image files here** - Add .png, .jpg, .svg, or other image files directly to this folder
2. **Import in your components** - Use relative imports from your components:
   ```tsx
   import myImage from "../../assets/images/my-image.png";
   ```

## Current Images

- `logo.png` - Main codeIT logo (puzzle-piece design with cyan/purple gradients)

## Organization Tips

You can create subfolders for better organization:
- `/images/logos/` - All logo variations
- `/images/icons/` - Custom icon images
- `/images/backgrounds/` - Background images
- `/images/screenshots/` - Product screenshots
- `/images/avatars/` - User avatar placeholders

## Usage Examples

### Direct Import
```tsx
import heroImage from "../../assets/images/hero-background.png";

function Hero() {
  return <img src={heroImage} alt="Hero" />;
}
```

### With ImageWithFallback Component
```tsx
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import featureImage from "../../assets/images/feature.png";

function Feature() {
  return <ImageWithFallback src={featureImage} alt="Feature" />;
}
```

### For Figma Assets
If using figma:asset scheme:
```tsx
import image from "figma:asset/[hash].png";
```
