import * as React from "react";

type TableProps = React.ComponentProps<"table">;
type TableSectionProps = React.ComponentProps<"thead">;
type TableBodyProps = React.ComponentProps<"tbody">;
type TableRowProps = React.ComponentProps<"tr">;
type TableHeadProps = React.ComponentProps<"th">;
type TableCellProps = React.ComponentProps<"td">;
type TableCaptionProps = React.ComponentProps<"caption">;

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`.trim()}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
  ({ className = "", ...props }, ref) => (
    <thead ref={ref} className={`[&_tr]:border-b ${className}`.trim()} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className = "", ...props }, ref) => (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 ${className}`.trim()}
      {...props}
    />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(
  ({ className = "", ...props }, ref) => (
    <tfoot
      ref={ref}
      className={`border-t bg-slate-50/50 font-medium [&>tr]:last:border-b-0 ${className}`.trim()}
      {...props}
    />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = "", ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100 ${className}`.trim()}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className = "", ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = "", ...props }, ref) => (
    <td
      ref={ref}
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className = "", ...props }, ref) => (
    <caption
      ref={ref}
      className={`mt-4 text-sm text-slate-500 ${className}`.trim()}
      {...props}
    />
  ),
);
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
