import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Gift, Users, ImageIcon } from 'lucide-react';

interface Bonificacao {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  qtd_premiados: number;
  ativo: boolean;
  created_at: string;
}

export default function AdminBonificacao() {
  const [bonificacoes, setBonificacoes] = useState<Bonificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [qtdPremiados, setQtdPremiados] = useState(3);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchBonificacoes();
  }, []);

  async function fetchBonificacoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('bonificacoes' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar bonificações');
      console.error(error);
    } else {
      setBonificacoes((data as any) || []);
    }
    setLoading(false);
  }

  function resetForm() {
    setTitulo('');
    setDescricao('');
    setQtdPremiados(3);
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSave() {
    if (!titulo.trim()) {
      toast.error('Preencha o título');
      return;
    }
    setSaving(true);

    let imagem_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('bonificacoes')
        .upload(path, imageFile, { upsert: true });

      if (upErr) {
        toast.error('Erro ao enviar imagem');
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('bonificacoes')
        .getPublicUrl(path);
      imagem_url = urlData.publicUrl;
    }

    const { error } = await supabase
      .from('bonificacoes' as any)
      .insert({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        imagem_url,
        qtd_premiados: qtdPremiados,
      } as any);

    if (error) {
      toast.error('Erro ao salvar bonificação');
      console.error(error);
    } else {
      toast.success('Bonificação criada!');
      resetForm();
      setDialogOpen(false);
      fetchBonificacoes();
    }
    setSaving(false);
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await supabase
      .from('bonificacoes' as any)
      .update({ ativo: !ativo, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar');
    } else {
      setBonificacoes((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ativo: !ativo } : b))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta bonificação?')) return;

    const { error } = await supabase
      .from('bonificacoes' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Bonificação excluída');
      setBonificacoes((prev) => prev.filter((b) => b.id !== id));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Bonificação">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Cadastre prêmios para os vendedores do topo do ranking.
          </p>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova Bonificação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Bonificação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Kit Whey Protein" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do prêmio..." rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qtd">Qtd. de premiados</Label>
                  <Input id="qtd" type="number" min={1} max={100} value={qtdPremiados} onChange={(e) => setQtdPremiados(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Quantos vendedores do topo do ranking serão premiados</p>
                </div>

                <div className="space-y-2">
                  <Label>Imagem do prêmio</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('img-upload')?.click()}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-md object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="h-8 w-8" />
                        <span className="text-sm">Clique para enviar imagem</span>
                      </div>
                    )}
                  </div>
                  <input id="img-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Salvando...' : 'Salvar Bonificação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : bonificacoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Gift className="h-12 w-12" />
              <p>Nenhuma bonificação cadastrada</p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>Criar primeira bonificação</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bonificacoes.map((b) => (
              <Card key={b.id} className={`overflow-hidden transition-opacity ${!b.ativo ? 'opacity-50' : ''}`}>
                {b.imagem_url ? (
                  <div className="h-48 bg-muted">
                    <img src={b.imagem_url} alt={b.titulo} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{b.titulo}</h3>
                    {b.descricao && <p className="text-sm text-muted-foreground mt-1">{b.descricao}</p>}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Top {b.qtd_premiados} do ranking</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch checked={b.ativo} onCheckedChange={() => toggleAtivo(b.id, b.ativo)} />
                      <span className="text-xs text-muted-foreground">{b.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
