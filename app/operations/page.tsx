import { OperationsDashboard } from "@/components/operations/OperationsDashboard";

type OperationsPageProps = {
  searchParams: Promise<{ zone?: string }>;
};

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const { zone } = await searchParams;
  return <OperationsDashboard initialZoneId={zone ?? null}/>;
}
