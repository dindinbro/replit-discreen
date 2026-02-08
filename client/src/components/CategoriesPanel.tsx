import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  Folder,
  Globe,
  Gamepad2,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  Shield,
  Database,
  Users,
  Smartphone,
  Music,
  Film,
  BookOpen,
  Heart,
  Zap,
  Star,
  Briefcase,
  Car,
  Plane,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  Globe,
  Gamepad2,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  Shield,
  Database,
  Users,
  Smartphone,
  Music,
  Film,
  BookOpen,
  Heart,
  Zap,
  Star,
  Briefcase,
  Car,
  Plane,
  LayoutGrid,
};

export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Folder;
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface CategoriesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesPanel({ open, onOpenChange }: CategoriesPanelProps) {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[380px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Catégories
          </SheetTitle>
          <SheetDescription>
            Parcourez les bases de données par catégorie
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Chargement...
              </div>
            )}

            {!isLoading && (!categories || categories.length === 0) && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Aucune catégorie disponible
              </div>
            )}

            {categories?.map((cat) => {
              const Icon = getIconComponent(cat.icon);
              return (
                <div
                  key={cat.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover-elevate cursor-default"
                  data-testid={`category-item-${cat.id}`}
                >
                  <div
                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `${cat.color}18`,
                      color: cat.color,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
