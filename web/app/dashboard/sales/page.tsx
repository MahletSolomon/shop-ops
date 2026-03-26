import React from "react";
import PageTitle from "@/app/components/ui/PageTitle";
import Card from "@/app/components/ui/Card";
import SalesTable from "@/app/components/tables/SalesTable";
import { DollarSign } from "lucide-react";

const page = () => {
  return (
    <div className="flex flex-col space-y-4">
      <PageTitle title="Sales" subtitle="View and manage sales records" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Today's Sales"
          value="Br 12,450.00"
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="10 transactions"
        />
        <Card
          title="Avg. Sale"
          value="Br 12,450.00"
          icon={DollarSign}
          iconWrapperClass="bg-indigo-50 text-indigo-600"
          trend=""
          trendDirection=""
          description="vs last period"
        />
      </div>

      <SalesTable />
    </div>
  );
};

export default page;
