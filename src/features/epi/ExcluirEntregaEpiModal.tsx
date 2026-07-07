import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import type { EntregaEpi } from "../../types/domain";

interface ExcluirEntregaEpiModalProps {
  entrega: EntregaEpi;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmação antes de excluir uma entrega de EPI já registrada — ação irreversível. */
export function ExcluirEntregaEpiModal({ entrega, onClose, onConfirm }: ExcluirEntregaEpiModalProps) {
  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <Modal
      title="Excluir entrega de EPI"
      subtitle={`${entrega.epi} · ${entrega.dataEntrega}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Excluir entrega
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.6 }}>
        Esta ação remove o registro de entrega de <strong style={{ color: "var(--color-navy)" }}>{entrega.epi}</strong> (qtd {entrega.qtd},
        entregue em {entrega.dataEntrega}) e não pode ser desfeita. Se a ficha já tiver sido gerada ou assinada, os documentos anexados a
        este registro também deixam de ficar acessíveis.
      </div>
    </Modal>
  );
}
