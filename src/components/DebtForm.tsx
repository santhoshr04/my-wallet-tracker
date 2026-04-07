import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import type { DebtDirection } from '@/hooks/useDebts';
import { nowLocalTimeHHMM } from '@/lib/transactionDatetime';

type DebtDraft = {
  direction: DebtDirection;
  amount: number;
  person_name: string;
  description: string;
  /** Calendar day for the linked income/expense transaction */
  tx_date: string;
  /** HH:mm for the linked transaction */
  tx_time: string;
};

export default function DebtForm({
  onSubmit,
  loading,
  title = 'Add Debt',
}: {
  onSubmit: (draft: DebtDraft) => void;
  loading?: boolean;
  title?: string;
}) {
  const [direction, setDirection] = useState<DebtDirection>('borrowed');
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(nowLocalTimeHHMM());
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    onSubmit({
      direction,
      amount: amt,
      person_name: personName.trim(),
      description: description.trim(),
      tx_date: txDate,
      tx_time: txTime,
    });
  };

  const validPerson = personName.trim().length > 0;
  const validAmount = Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center">
            <ToggleGroup
              type="single"
              value={direction}
              onValueChange={(v) => {
                if (v === 'borrowed' || v === 'lent') setDirection(v);
              }}
              className="w-full justify-stretch"
            >
              <ToggleGroupItem value="borrowed" className="flex-1">Borrowed</ToggleGroupItem>
              <ToggleGroupItem value="lent" className="flex-1">Lent</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Input
            type="number"
            inputMode="decimal"
            placeholder="Amount (₹)"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <Input
            placeholder="Person Name"
            required
            value={personName}
            onChange={e => setPersonName(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="debt-tx-date">Transaction date</Label>
              <Input id="debt-tx-date" type="date" required value={txDate} onChange={e => setTxDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="debt-tx-time">Transaction time</Label>
              <Input id="debt-tx-time" type="time" required value={txTime} onChange={e => setTxTime(e.target.value)} />
            </div>
          </div>
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <Button type="submit" className="w-full touch-manipulation" disabled={loading || !validPerson || !validAmount}>
            {loading ? 'Saving...' : 'Add Debt'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

