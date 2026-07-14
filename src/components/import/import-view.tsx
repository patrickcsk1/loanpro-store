"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { ApiError, importProducts } from "@/components/store/api";
import { productKeys } from "@/components/store/queries";
import type { ImportReport } from "@/components/store/types";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatKey = "totalRows" | "imported" | "updated" | "skipped" | "invalid";

const STAT_TILES: Array<{ key: StatKey; label: string; tone: string }> = [
  { key: "totalRows", label: "Total rows", tone: "text-foreground" },
  { key: "imported", label: "Imported", tone: "text-emerald-600 dark:text-emerald-400" },
  { key: "updated", label: "Updated", tone: "text-accent" },
  { key: "skipped", label: "Skipped", tone: "text-muted-foreground" },
  { key: "invalid", label: "Invalid", tone: "text-destructive" },
];

function statusVariant(status: string) {
  switch (status) {
    case "imported":
      return "success" as const;
    case "updated":
      return "accent" as const;
    case "invalid":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

const TEMPLATE_COLUMNS: Array<{ name: string; required: boolean; note: string }> = [
  { name: "name", required: true, note: "Product name" },
  { name: "sku", required: true, note: "Unique code; a matching SKU updates that product" },
  { name: "description", required: false, note: "Free text" },
  { name: "category", required: false, note: "Defaults to Uncategorized" },
  { name: "price", required: true, note: "e.g. 49.99 — $ and “free” are accepted" },
  { name: "stock", required: false, note: "Whole number; defaults to 0" },
  { name: "weight_kg", required: false, note: "Decimal; defaults to 0" },
];

function downloadTemplate() {
  const header = TEMPLATE_COLUMNS.map((column) => column.name).join(",");
  const sample = "Wireless Keyboard,KB-1001,Compact mechanical keyboard,Peripherals,49.99,25,0.8";
  const blob = new Blob([`${header}\n${sample}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "product-import-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ImportView() {
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [report, setReport] = React.useState<ImportReport | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (selected: File) => importProducts(selected),
    onSuccess: (result) => {
      setReport(result);
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast({
        variant: "success",
        title: "Import complete",
        description: `${result.imported} imported · ${result.updated} updated · ${result.invalid} invalid.`,
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Unexpected error.";
      toast({ variant: "destructive", title: "Import failed", description: message });
    },
  });

  const selectFile = (next: File | null) => {
    setReport(null);
    setFile(next);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bulk import</h1>
          <p className="text-muted-foreground">
            Upload a CSV to create or update products. Existing SKUs are updated; new SKUs are created.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="size-4" />
          Download template
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-semibold">Expected columns</p>
                <p className="text-sm text-muted-foreground">
                  Download the template, fill in your products, and upload it back. Column order does not matter, but the
                  header names must match.
                </p>
              </div>
              <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {TEMPLATE_COLUMNS.map((column) => (
                  <li key={column.name} className="flex items-baseline gap-2 text-sm">
                    <code className="font-mono font-semibold text-foreground">{column.name}</code>
                    {column.required ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">optional</span>
                    )}
                    <span className="text-xs text-muted-foreground">— {column.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40",
            )}
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="size-7" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">Drag &amp; drop your CSV here</p>
              <p className="text-sm text-muted-foreground">or click to browse — .csv files only</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </div>

          {file ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove file"
                onClick={() => selectFile(null)}
                disabled={mutation.isPending}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              onClick={() => file && mutation.mutate(file)}
              disabled={!file || mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {mutation.isPending ? "Importing…" : "Import products"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mutation.isError ? (
        <Card className="mt-6 border-destructive/30">
          <CardContent className="flex items-center gap-3 p-5 text-sm">
            <AlertCircle className="size-5 shrink-0 text-destructive" />
            <span>{(mutation.error as Error)?.message ?? "Import failed."}</span>
          </CardContent>
        </Card>
      ) : null}

      {report ? (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {STAT_TILES.map((tile) => (
              <Card key={tile.key}>
                <CardContent className="p-5">
                  <p className={cn("text-3xl font-extrabold tracking-tight", tile.tone)}>{report[tile.key]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No row details reported.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.details.map((detail, index) => (
                      <TableRow key={`${detail.row}-${index}`}>
                        <TableCell className="font-mono text-muted-foreground">{detail.row}</TableCell>
                        <TableCell className="font-mono">{detail.sku || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(detail.status)} className="capitalize">
                            {detail.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{detail.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
