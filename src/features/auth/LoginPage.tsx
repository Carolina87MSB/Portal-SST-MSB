import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Button, TextInput } from "../../components/ui";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src="/assets/logo-msb-oficial.png" alt="MSB · Medical System do Brasil" height={62} className={styles.logo} />
        <div className={styles.eyebrow}>Portal SST</div>
        <div className={styles.heading}>Acesso ao portal</div>
        <p className={styles.description}>
          Identifique-se com seu e-mail corporativo. A edição de exames, anexos e desligamentos é exclusiva do RH.
        </p>
        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="login-email">
            E-mail corporativo
          </label>
          <TextInput
            id="login-email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="nome@msbbrasil.com"
            autoFocus
          />
          {error ? <div className={styles.error}>{error}</div> : null}
          <Button type="submit" className={styles.submit}>
            Entrar
          </Button>
        </form>
        <div className={styles.footer}>
          <div className={styles.footerHead}>
            <ShieldCheck size={15} />
            Acesso restrito · RH / Administrador SST
          </div>
          <div className={styles.footerEmails}>carolina.cruz@msbbrasil.com · leslie.souza@msbbrasil.com</div>
          <div>Apenas e-mails corporativos MSB autorizados pelo RH. Não há cadastro aberto de usuários.</div>
        </div>
      </div>
    </div>
  );
}
