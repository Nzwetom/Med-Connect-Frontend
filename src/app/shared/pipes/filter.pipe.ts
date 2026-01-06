import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filter', standalone: true })
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string, ...fields: string[]): any[] {
    if (!items || !searchText) return items;
    return items.filter(item =>
      fields.some(f =>
        item[f]?.toString().toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }
}
