import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-slate-700">
          {{ title }} <span *ngIf="required" class="text-red-600">*</span>
        </label>
        <button
          type="button"
          (click)="clear()"
          class="text-[11px] font-semibold text-[#1394db] hover:underline"
        >
          Clear Pad
        </button>
      </div>

      <div
        class="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden"
      >
        <canvas
          #signatureCanvas
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="stopDrawing()"
          (mouseleave)="stopDrawing()"
          (touchstart)="startDrawingTouch($event)"
          (touchmove)="drawTouch($event)"
          (touchend)="stopDrawing()"
          class="w-full h-36 cursor-crosshair touch-none block bg-white"
        ></canvas>

        <div
          *ngIf="isEmpty"
          class="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-medium"
        >
          Draw signature here using mouse or touch
        </div>
      </div>
    </div>
  `,
})
export class SignaturePadComponent implements AfterViewInit {
  @Input() title: string = 'Signature';
  @Input() required: boolean = false;
  @Output() signatureChange = new EventEmitter<string | null>();

  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  isEmpty = true;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.offsetWidth || 400;
    canvas.height = canvas.offsetHeight || 144;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#0f172a';
  }

  startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    this.isEmpty = false;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    this.ctx.stroke();
    this.emitSignature();
  }

  startDrawingTouch(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 0) return;
    this.isDrawing = true;
    this.isEmpty = false;
    const touch = event.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  drawTouch(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || event.touches.length === 0) return;
    const touch = event.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
    this.emitSignature();
  }

  stopDrawing(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.emitSignature();
    }
  }

  clear(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.isEmpty = true;
    this.signatureChange.emit(null);
  }

  getBase64(): string | null {
    if (this.isEmpty) return null;
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    return dataUrl.split(',')[1] || null;
  }

  private emitSignature(): void {
    const base64 = this.getBase64();
    this.signatureChange.emit(base64);
  }
}
