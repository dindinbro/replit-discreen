import { GroupedResult } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ResultGroupCardProps {
  result: GroupedResult;
}

export function ResultGroupCard({ result }: ResultGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer bg-card hover:bg-accent/5 transition-colors p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={cn(
              "p-2 rounded-lg bg-primary/10 text-primary transition-colors duration-300",
              isExpanded ? "bg-primary text-primary-foreground" : ""
            )}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold text-lg truncate pr-4 text-foreground">
                {result.source}
              </h3>
              <p className="text-xs text-muted-foreground">
                Database Source File
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="font-mono">
              {result.count} hits
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="bg-muted/30 border-t border-border/50 p-0">
                <div className="flex flex-col divide-y divide-border/30">
                  {result.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 font-mono text-sm text-foreground/80 hover:bg-background/80 hover:text-foreground transition-colors break-all"
                    >
                      {item.lineNumber && (
                        <span className="inline-block w-12 text-muted-foreground/60 select-none border-r border-border/50 mr-3">
                          {item.lineNumber}
                        </span>
                      )}
                      {item.content}
                    </div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
