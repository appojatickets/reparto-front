import { Insignia } from './ui';

/** Las insignias ✓ de lo que ya se revisó: el pin (una persona o las entregas lo confirmaron) y la foto de la fachada (la dio por buena el admin). */
export const InsigniasDeVerificacion = ({ pin, foto }: { readonly pin?: boolean | undefined; readonly foto?: boolean | undefined }) =>
  pin === true || foto === true ? (
    <>
      {pin === true ? <span aria-label="Pin verificado"><Insignia>✓ PIN</Insignia></span> : null}
      {foto === true ? <span aria-label="Foto verificada"><Insignia>✓ FOTO</Insignia></span> : null}
    </>
  ) : null;
