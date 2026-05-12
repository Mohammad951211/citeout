import { Table, Thead, Tbody, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  citationCount: number;
}

interface UsersTableProps {
  users: UserRow[];
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] overflow-hidden">
      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Citations</Th>
            <Th>Joined</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td className="font-medium text-[var(--text-primary)]">
                {u.name ?? "—"}
              </Td>
              <Td className="text-[var(--text-secondary)]">{u.email}</Td>
              <Td>
                <Badge variant={u.role === "ADMIN" ? "q2" : "default"}>
                  {u.role}
                </Badge>
              </Td>
              <Td className="font-mono text-sm">{u.citationCount}</Td>
              <Td className="text-xs text-[var(--text-secondary)]">
                {new Date(u.createdAt).toLocaleDateString()}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
