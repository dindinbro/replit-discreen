import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Palmtree } from "lucide-react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-[1000] w-[360px] max-w-[calc(100vw-2rem)]">
          <Card className="flex flex-col overflow-visible shadow-lg border border-border" data-testid="card-chat-vacation">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-primary/5 rounded-t-md">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Assistant Discreen</span>
              </div>
              <Button
                data-testid="button-chat-close"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Palmtree className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base" data-testid="text-vacation-title">
                  L'assistant est en vacances
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-vacation-message">
                  Il revient prochainement avec de nouvelles fonctionnalites.
                  En attendant, n'hesitez pas a consulter notre documentation.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Button
        data-testid="button-chat-toggle"
        className="fixed bottom-4 right-4 z-[1000] rounded-full shadow-lg"
        size="icon"
        onClick={() => setOpen(!open)}
        title={open ? "Fermer" : "Assistant"}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>
    </>
  );
}
