import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CreatePatientAccessRequest {
  patientId: string;
  patientEmail: string;
  patientName: string;
  therapistName?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { patientId, patientEmail, patientName, therapistName }: CreatePatientAccessRequest = await req.json();

    console.log("=== INÍCIO create-patient-access ===");
    console.log("Dados recebidos:", { patientId, patientEmail, patientName, therapistName });

    if (!patientId || !patientEmail || !patientName) {
      console.log("❌ Dados obrigatórios ausentes:", { patientId: !!patientId, patientEmail: !!patientEmail, patientName: !!patientName });
      return new Response(
        JSON.stringify({ error: "ID do paciente, email e nome são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Dados básicos validados, iniciando criação de acesso...");

    // 1. Verificar se o paciente já tem uma conta de usuário
    const { data: existingPatient, error: patientError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError) {
      console.error("Erro ao buscar paciente:", patientError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao buscar dados do paciente",
          details: patientError.message 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!existingPatient) {
      console.error("Paciente não encontrado:", patientId);
      return new Response(
        JSON.stringify({ 
          error: "Paciente não encontrado",
          patientId: patientId
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (existingPatient?.user_id) {
      console.log("Paciente já possui conta de usuário:", existingPatient.user_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Paciente já possui acesso à plataforma",
          userExists: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 2. Criar usuário no auth.users usando Admin API
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: patientEmail,
      password: crypto.randomUUID(), // Senha temporária
      email_confirm: false, // Não confirmar automaticamente
      user_metadata: {
        full_name: patientName,
        user_type: 'patient'
      }
    });

    if (createUserError) {
      console.error("Erro ao criar usuário:", createUserError);
      
      // Se o erro for de usuário já existente, tentar recuperar o usuário
      if (createUserError.message?.includes('already registered') || 
          createUserError.message?.includes('already exists') ||
          createUserError.message?.includes('User already registered') ||
          createUserError.message?.includes('email_exists')) {
        
        try {
          console.log("Tentando listar usuários para encontrar o email existente...");
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const foundUser = existingUsers.users?.find(u => u.email === patientEmail);
          
          if (foundUser) {
            console.log("Usuário já existe, analisando vinculação:", foundUser.id);
            
            // Verificar se este usuário já está vinculado a um perfil de terapeuta
            const { data: existingProfile, error: profileError } = await supabase
              .from('profiles')
              .select('user_type, full_name, role')
              .eq('user_id', foundUser.id)
              .maybeSingle();
            
            if (profileError) {
              console.warn("Erro ao buscar perfil existente:", profileError);
            }
            
            if (existingProfile) {
              if (existingProfile.user_type === 'therapist') {
                return new Response(JSON.stringify({
                  error: "Email em uso por terapeuta",
                  message: `Este email já está sendo usado por ${existingProfile.full_name} como terapeuta no sistema. Use um email diferente ou contacte o administrador para resolver o conflito.`,
                  userExists: true,
                  isTherapist: true,
                  conflictData: {
                    existingName: existingProfile.full_name,
                    existingRole: existingProfile.role,
                    existingType: existingProfile.user_type
                  }
                }), {
                  status: 400,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                });
              } else if (existingProfile.user_type === 'patient') {
                // Verificar se já está vinculado a outro paciente
                const { data: linkedPatient } = await supabase
                  .from('patients')
                  .select('id, name, email')
                  .eq('user_id', foundUser.id)
                  .maybeSingle();
                
                if (linkedPatient && linkedPatient.id !== patientId) {
                  return new Response(JSON.stringify({
                    error: "Email em uso por outro paciente",
                    message: `Este email já está vinculado ao paciente ${linkedPatient.name}. Use um email diferente.`,
                    userExists: true,
                    isPatient: true,
                    conflictData: {
                      existingName: linkedPatient.name,
                      existingEmail: linkedPatient.email
                    }
                  }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                  });
                }
              }
            }
            
            // Se chegou até aqui, pode vincular o usuário existente
            console.log("Vinculando usuário existente ao paciente atual...");
            const { error: linkError } = await supabase
              .from('patients')
              .update({ user_id: foundUser.id })
              .eq('id', patientId);

            if (linkError) {
              console.error("Erro ao vincular usuário existente:", linkError);
              return new Response(JSON.stringify({
                error: "Erro ao vincular usuário",
                details: linkError.message
              }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }

            // Criar/atualizar perfil do paciente se necessário
            if (!existingProfile || existingProfile.user_type !== 'patient') {
              const { error: profileUpsertError } = await supabase
                .from('profiles')
                .upsert({
                  user_id: foundUser.id,
                  full_name: patientName,
                  email: patientEmail,
                  role: 'assistant',
                  user_type: 'patient'
                }, {
                  onConflict: 'user_id'
                });
              
              if (profileUpsertError) {
                console.warn("Erro ao criar/atualizar perfil do paciente:", profileUpsertError);
              }
            }

            // Enviar email para redefinir senha
            try {
              await sendPasswordResetEmail(patientEmail, patientName, therapistName);
              
              return new Response(JSON.stringify({
                success: true,
                message: "Usuário já existia e foi vinculado ao paciente",
                userId: foundUser.id,
                emailSent: true,
                wasLinked: true
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            } catch (emailError) {
              console.error("Erro ao enviar email:", emailError);
              return new Response(JSON.stringify({
                success: true,
                message: "Usuário vinculado mas erro ao enviar email",
                userId: foundUser.id,
                emailSent: false,
                emailError: emailError instanceof Error ? emailError.message : 'Erro desconhecido',
                wasLinked: true
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
          } else {
            // Usuário não encontrado na lista, mas auth diz que existe
            // Isso pode indicar um problema de sincronização
            return new Response(JSON.stringify({
              error: "Conflito de email não resolvido",
              message: "Existe uma inconsistência no sistema. Contacte o administrador.",
              details: "Email reportado como existente mas usuário não encontrado na lista"
            }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        } catch (listError) {
          console.error("Erro ao listar usuários:", listError);
          return new Response(JSON.stringify({
            error: "Erro ao verificar usuários existentes",
            details: listError instanceof Error ? listError.message : 'Erro desconhecido'
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
      
      console.error("Erro final na criação do usuário:", createUserError);
      return new Response(JSON.stringify({
        error: "Erro ao criar usuário",
        details: createUserError.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!newUser.user) {
      console.error("❌ Falha na criação do usuário - dados do usuário não retornados");
      return new Response(JSON.stringify({
        error: "Falha na criação do usuário",
        details: "Dados do usuário não foram retornados pela API"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ Usuário criado com sucesso:", newUser.user.id);

    // 3. Vincular o usuário ao paciente
    const { error: updatePatientError } = await supabase
      .from('patients')
      .update({ user_id: newUser.user.id })
      .eq('id', patientId);

    if (updatePatientError) {
      console.error("Erro ao vincular usuário ao paciente:", updatePatientError);
      // Tentar deletar o usuário criado se falhar a vinculação
      try {
        await supabase.auth.admin.deleteUser(newUser.user.id);
      } catch (deleteError) {
        console.error("Erro ao deletar usuário criado:", deleteError);
      }
      return new Response(JSON.stringify({
        error: "Erro ao vincular usuário ao paciente",
        details: updatePatientError.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Usuário vinculado ao paciente com sucesso");

    // 4. Enviar email de definição de senha
    try {
      await sendPasswordSetupEmail(patientEmail, patientName, therapistName);
      console.log("Email de configuração enviado com sucesso");
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return new Response(JSON.stringify({
        success: true,
        message: "Usuário criado mas erro ao enviar email",
        userId: newUser.user.id,
        emailSent: false,
        emailError: emailError instanceof Error ? emailError.message : 'Erro desconhecido'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Acesso criado e email enviado com sucesso",
      userId: newUser.user.id,
      emailSent: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro na função create-patient-access:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendPasswordSetupEmail(patientEmail: string, patientName: string, therapistName?: string) {
  const baseUrl = "https://corphus.ai";
  const signupUrl = `${baseUrl}/patient-signup?email=${encodeURIComponent(patientEmail)}`;

  const emailResponse = await resend.emails.send({
    from: "Monitor Terapêutico <contato@corphus.ai>",
    to: [patientEmail],
    subject: "Bem-vindo! Crie sua senha de acesso - Monitor Terapêutico",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Monitor Terapêutico</h1>
          <p style="color: #64748b; margin: 5px 0;">Plataforma de Gestão Terapêutica</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin-top: 0;">Parabéns, ${patientName}!</h2>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Seus dados foram confirmados com sucesso! ${therapistName ? `Seu terapeuta ${therapistName}` : 'Seu terapeuta'} criou seu acesso ao Monitor Terapêutico.
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
            Para completar seu acesso, você precisa criar uma senha segura. Clique no botão abaixo:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              🔐 Criar Minha Senha
            </a>
          </div>
          
          <div style="background: #e0f2fe; border: 1px solid #0277bd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #01579b; margin: 0; font-size: 14px;">
              <strong>📧 Seu email de acesso:</strong> ${patientEmail}
            </p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <h3 style="color: #1e293b; font-size: 16px;">O que você pode fazer na plataforma:</h3>
          <ul style="color: #475569; line-height: 1.6;">
            <li>Acompanhar seu progresso terapêutico em tempo real</li>
            <li>Visualizar atividades e exercícios prescritos</li>
            <li>Registrar sua evolução e feedback</li>
            <li>Manter contato direto com seu terapeuta</li>
            <li>Acessar seu histórico completo de sessões</li>
          </ul>
        </div>
        
        <div style="background: #f1f5f9; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="color: #64748b; margin: 0; font-size: 14px; text-align: center;">
            Se você não solicitou este acesso ou tem dúvidas, entre em contato com seu terapeuta.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Monitor Terapêutico. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `,
  });

  if (emailResponse.error) {
    throw new Error(`Erro ao enviar email: ${emailResponse.error.message}`);
  }
}

async function sendPasswordResetEmail(patientEmail: string, patientName: string, therapistName?: string) {
  const baseUrl = "https://corphus.ai";
  const loginUrl = `${baseUrl}/patient-login`;

  const emailResponse = await resend.emails.send({
    from: "Monitor Terapêutico <contato@corphus.ai>",
    to: [patientEmail],
    subject: "Acesso confirmado - Monitor Terapêutico",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Monitor Terapêutico</h1>
          <p style="color: #64748b; margin: 5px 0;">Plataforma de Gestão Terapêutica</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin-top: 0;">Olá, ${patientName}!</h2>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Seus dados foram confirmados e sua conta já existe em nossa plataforma! 
            ${therapistName ? `Seu terapeuta ${therapistName}` : 'Seu terapeuta'} confirmou suas informações.
          </p>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
            Você pode fazer login usando sua senha atual ou redefini-la se preferir:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px;">
              🔓 Fazer Login
            </a>
          </div>
          
          <div style="background: #e0f2fe; border: 1px solid #0277bd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #01579b; margin: 0; font-size: 14px;">
              <strong>📧 Seu email de acesso:</strong> ${patientEmail}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Monitor Terapêutico. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `,
  });

  if (emailResponse.error) {
    throw new Error(`Erro ao enviar email: ${emailResponse.error.message}`);
  }
}

serve(handler);