import React from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Lock, Sparkles, Save, Key, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';



export const AdvancedPromptTab = ({ advancedPrompt, setAdvancedPrompt, isAdmin, effectiveClientId, getAuthHeaders }) => {
  const [promptPasswordInput, setPromptPasswordInput] = React.useState('');
  const [promptPasswordVerified, setPromptPasswordVerified] = React.useState(false);
  const [verifyingPassword, setVerifyingPassword] = React.useState(false);

  const verifyPromptPassword = async () => {
    setVerifyingPassword(true);
    try {
      const response = await axios.post(`${API}/verify-prompt-password`, {
        password: promptPasswordInput, client_id: effectiveClientId
      }, { headers: getAuthHeaders() });
      if (response.data.valid) {
        setPromptPasswordVerified(true);
        toast.success('Accesso verificato');
      } else {
        toast.error('Password non valida');
      }
    } catch (error) {
      toast.error('Errore verifica password');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const saveAdvancedPrompt = async () => {
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/advanced-prompt`, {
        password: promptPasswordInput,
        secondo_livello_prompt: advancedPrompt.secondo_livello_prompt,
        keyword_injection_template: advancedPrompt.keyword_injection_template,
        prompt_password: isAdmin ? advancedPrompt.prompt_password : undefined
      }, { headers: getAuthHeaders() });
      toast.success('Prompt avanzato salvato');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio prompt');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!promptPasswordVerified ? (
        <Card className="border-slate-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <CardTitle>Area Protetta</CardTitle>
            <CardDescription>Inserisci la password per accedere alla modifica del Prompt di Secondo Livello</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm mx-auto space-y-4">
              <Input
                type="password"
                value={promptPasswordInput}
                onChange={(e) => setPromptPasswordInput(e.target.value)}
                placeholder="Password di accesso"
                onKeyPress={(e) => e.key === 'Enter' && verifyPromptPassword()}
                data-testid="prompt-password-input"
              />
              <Button
                onClick={verifyPromptPassword}
                className="w-full bg-slate-900"
                disabled={verifyingPassword || !promptPasswordInput}
                data-testid="verify-password-btn"
              >
                {verifyingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Verifica Password
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Alert className="bg-emerald-50 border-emerald-200">
            <AlertCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              Accesso verificato. Puoi modificare il prompt di generazione.
            </AlertDescription>
          </Alert>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Prompt di Secondo Livello
              </CardTitle>
              <CardDescription>
                Questo prompt viene iniettato durante la generazione degli articoli per guidare lo stile e l'inserimento delle keyword.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Prompt Principale</Label>
                <Textarea
                  value={advancedPrompt.secondo_livello_prompt}
                  onChange={(e) => setAdvancedPrompt({ ...advancedPrompt, secondo_livello_prompt: e.target.value })}
                  placeholder="Inserisci istruzioni avanzate per la generazione degli articoli..."
                  rows={8}
                  className="font-mono text-sm"
                  data-testid="secondo-livello-prompt-input"
                />
                <p className="text-xs text-slate-500">
                  Usa {'{keyword}'} per inserire la keyword target dinamicamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Template Iniezione Keyword</Label>
                <Textarea
                  value={advancedPrompt.keyword_injection_template}
                  onChange={(e) => setAdvancedPrompt({ ...advancedPrompt, keyword_injection_template: e.target.value })}
                  placeholder="Template per l'inserimento strategico delle keyword..."
                  rows={4}
                  className="font-mono text-sm"
                  data-testid="keyword-injection-input"
                />
              </div>

              {isAdmin && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Password Cliente (Solo Admin)
                    </Label>
                    <Input
                      type="text"
                      value={advancedPrompt.prompt_password}
                      onChange={(e) => setAdvancedPrompt({ ...advancedPrompt, prompt_password: e.target.value })}
                      placeholder="Imposta password per questo cliente"
                      data-testid="client-prompt-password-input"
                    />
                    <p className="text-xs text-slate-500">
                      Questa password permette al cliente di modificare il proprio prompt.
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={saveAdvancedPrompt}
                className="w-full bg-orange-500 hover:bg-orange-600"
                data-testid="save-advanced-prompt-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Salva Prompt Avanzato
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
