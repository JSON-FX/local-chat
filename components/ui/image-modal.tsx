import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { X, Download, ZoomIn, ZoomOut, Minus, Plus } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  imageAlt: string;
  fileName?: string;
  onDownload?: () => void;
}

export function ImageModal({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  fileName,
  onDownload
}: ImageModalProps) {
  const [imageDimensions, setImageDimensions] = React.useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    fitScale: number;
  } | null>(null);
  
  const [zoomLevel, setZoomLevel] = React.useState(0); // 0-100 scale
  const [panPosition, setPanPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, panX: 0, panY: 0 });
  
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // Calculate fit-to-screen scale based on modal container size
    // Use a more conservative container size to ensure proper fitting
    const containerWidth = Math.min(window.innerWidth * 0.8, 1100); // Leave room for controls
    const containerHeight = Math.min(window.innerHeight * 0.7, 700); // Leave room for header/footer
    
    const widthRatio = containerWidth / naturalWidth;
    const heightRatio = containerHeight / naturalHeight;
    const fitScale = Math.min(widthRatio, heightRatio); // Always scale to fit, even for small images
    
    const displayWidth = naturalWidth * fitScale;
    const displayHeight = naturalHeight * fitScale;
    
    setImageDimensions({
      width: displayWidth,
      height: displayHeight,
      naturalWidth,
      naturalHeight,
      fitScale
    });
    
    // Reset zoom and pan
    setZoomLevel(0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Calculate current scale based on zoom level (0-100)
  const getCurrentScale = () => {
    if (!imageDimensions) return 1;
    
    const { fitScale } = imageDimensions;
    
    if (zoomLevel === 0) {
      // Zoom level 0 = fit to screen
      return fitScale;
    } else {
      // Zoom level 1-100 = linear scale from fit to 3x actual size
      // This ensures all images can zoom significantly
      const minScale = fitScale;
      const maxScale = Math.max(3, fitScale * 3); // At least 3x zoom capability
      return minScale + (zoomLevel / 100) * (maxScale - minScale);
    }
  };

  const getCurrentDimensions = () => {
    if (!imageDimensions) return { width: 0, height: 0 };
    
    const scale = getCurrentScale();
    return {
      width: imageDimensions.naturalWidth * scale,
      height: imageDimensions.naturalHeight * scale
    };
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        panX: panPosition.x,
        panY: panPosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 0) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPanPosition({
        x: dragStart.panX + deltaX,
        y: dragStart.panY + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom level changes
  const handleZoomChange = (newZoomLevel: number) => {
    const clampedZoom = Math.max(0, Math.min(100, newZoomLevel));
    setZoomLevel(clampedZoom);
    
    // Reset pan position when zooming to prevent drift
    // Let the user pan manually after zooming
    setPanPosition({ x: 0, y: 0 });
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setImageDimensions(null);
      setZoomLevel(0);
      setPanPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  const getModalSize = () => {
    if (!imageDimensions) return { maxWidth: '95vw', maxHeight: '95vh' };
    
    // Use a fixed large size to prevent modal resizing during zoom
    // The image container will handle the actual image sizing and scrolling
    return {
      width: `${Math.min(window.innerWidth * 0.9, 1200)}px`,
      height: `${Math.min(window.innerHeight * 0.9, 800)}px`,
      maxWidth: '95vw',
      maxHeight: '95vh'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 overflow-hidden" 
        showCloseButton={false}
        style={getModalSize()}
      >
        {/* Accessibility titles - visually hidden */}
        <DialogTitle className="sr-only">
          {fileName ? `View image: ${fileName}` : 'View image'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Image viewer modal. Use the download button to save the image or close button to exit.
        </DialogDescription>
        
        <div className="relative flex flex-col h-full">
          {/* Header with zoom controls, download, and close buttons */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-black/50 rounded-md px-2 py-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20 border-0 p-0"
                onClick={() => handleZoomChange(zoomLevel - 10)}
                title="Zoom out"
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${zoomLevel}%, rgba(255,255,255,0.3) ${zoomLevel}%, rgba(255,255,255,0.3) 100%)`
                }}
                title={`Zoom: ${zoomLevel}%`}
              />
              
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20 border-0 p-0"
                onClick={() => handleZoomChange(zoomLevel + 10)}
                title="Zoom in"
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              <span className="text-xs text-white min-w-[2.5rem] text-center">
                {zoomLevel}%
              </span>
            </div>
            
            {/* Download Button */}
            {onDownload && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={onDownload}
                title="Download image"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {/* Close Button */}
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-0"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image container */}
          <div 
            ref={containerRef}
            className={`flex items-center justify-center bg-black/5 flex-1 ${zoomLevel > 0 ? 'overflow-auto cursor-grab' : 'overflow-hidden'} ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ 
              minHeight: '400px',
              position: 'relative'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Only render the image when imageSrc is not empty */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt={imageAlt}
                className="select-none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  width: imageDimensions ? `${imageDimensions.naturalWidth}px` : 'auto',
                  height: imageDimensions ? `${imageDimensions.naturalHeight}px` : 'auto',
                  transform: `translate(calc(-50% + ${panPosition.x}px), calc(-50% + ${panPosition.y}px)) scale(${getCurrentScale()})`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  display: 'block',
                  transformOrigin: 'center center'
                }}
                onLoad={handleImageLoad}
                draggable={false}
              />
            )}
          </div>

          {/* Footer with filename and zoom status */}
          <div className="p-4 bg-muted/50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {fileName && (
                  <p className="text-sm text-muted-foreground text-center">
                    {fileName}
                  </p>
                )}
              </div>
              
              {/* Zoom Status Indicator */}
              {imageDimensions && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {Math.round(getCurrentDimensions().width)} × {Math.round(getCurrentDimensions().height)}
                  </span>
                  <span>•</span>
                  <span>
                    {zoomLevel === 0 
                      ? 'Fit to screen' 
                      : `${Math.round(getCurrentScale() * 100)}% scale`
                    }
                  </span>
                  {zoomLevel > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-blue-400">Drag to pan</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 